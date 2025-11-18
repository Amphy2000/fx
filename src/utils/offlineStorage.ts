import { openDB } from 'idb';

let db: any = null;

export const initOfflineDB = async () => {
  if (db) return db;
  
  db = await openDB('amphy-offline', 1, {
    upgrade(database) {
      // Create trades store
      if (!database.objectStoreNames.contains('trades')) {
        const tradeStore = database.createObjectStore('trades', { keyPath: 'id' });
        tradeStore.createIndex('synced', 'synced', { unique: false });
        tradeStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Create journal entries store
      if (!database.objectStoreNames.contains('journalEntries')) {
        const journalStore = database.createObjectStore('journalEntries', { keyPath: 'id' });
        journalStore.createIndex('synced', 'synced', { unique: false });
        journalStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    },
  });
  
  return db;
};

export const saveTradeOffline = async (tradeData: any) => {
  const database = await initOfflineDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.put('trades', {
    id,
    data: tradeData,
    timestamp: Date.now(),
    synced: false,
  });
  
  return id;
};

export const saveJournalOffline = async (journalData: any) => {
  const database = await initOfflineDB();
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await database.put('journalEntries', {
    id,
    data: journalData,
    timestamp: Date.now(),
    synced: false,
  });
  
  return id;
};

export const getUnsyncedTrades = async () => {
  const database = await initOfflineDB();
  const tx = database.transaction('trades', 'readonly');
  const store = tx.objectStore('trades');
  const allTrades = await store.getAll();
  return allTrades.filter((trade: any) => !trade.synced);
};

export const getUnsyncedJournalEntries = async () => {
  const database = await initOfflineDB();
  const tx = database.transaction('journalEntries', 'readonly');
  const store = tx.objectStore('journalEntries');
  const allEntries = await store.getAll();
  return allEntries.filter((entry: any) => !entry.synced);
};

export const markTradeAsSynced = async (id: string) => {
  const database = await initOfflineDB();
  const trade = await database.get('trades', id);
  if (trade) {
    trade.synced = true;
    await database.put('trades', trade);
  }
};

export const markJournalAsSynced = async (id: string) => {
  const database = await initOfflineDB();
  const entry = await database.get('journalEntries', id);
  if (entry) {
    entry.synced = true;
    await database.put('journalEntries', entry);
  }
};

export const deleteOfflineTrade = async (id: string) => {
  const database = await initOfflineDB();
  await database.delete('trades', id);
};

export const deleteOfflineJournal = async (id: string) => {
  const database = await initOfflineDB();
  await database.delete('journalEntries', id);
};

export const isOnline = () => {
  return navigator.onLine;
};
