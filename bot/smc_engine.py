import pandas as pd
import numpy as np

class SMCEngine:
    def __init__(self, data):
        """
        Initialize the SMC Engine with OHLC data.
        :param data: pandas DataFrame with columns ['open', 'high', 'low', 'close', 'volume']
        """
        self.df = data.copy()

    def find_swing_points(self, window=5):
        """
        Identifies swing highs and swing lows.
        """
        self.df['swing_high'] = self.df['high'][(self.df['high'] == self.df['high'].rolling(window=window*2+1, center=True).max())]
        self.df['swing_low'] = self.df['low'][(self.df['low'] == self.df['low'].rolling(window=window*2+1, center=True).min())]
        
        # Displacement: Candle body is 2x larger than the average of last 10 bodies
        self.df['body_size'] = abs(self.df['close'] - self.df['open'])
        self.df['avg_body'] = self.df['body_size'].rolling(window=10).mean()
        self.df['displacement'] = self.df['body_size'] > (self.df['avg_body'] * 2.0)
        
        return self.df

    def detect_structure(self):
        """
        Detects Break of Structure (BOS) and Change of Character (ChoCh).
        """
        self.df['bos'] = False
        self.df['choch'] = False
        
        last_high = None
        last_low = None
        trend = 0  # 1 for bullish, -1 for bearish
        
        for i in range(len(self.df)):
            current_high = self.df.iloc[i]['swing_high']
            current_low = self.df.iloc[i]['swing_low']
            
            if not np.isnan(current_high):
                if trend == -1 and last_high and self.df.iloc[i]['high'] > last_high:
                    self.df.at[self.df.index[i], 'choch'] = True
                    trend = 1
                elif trend == 1 and last_high and self.df.iloc[i]['high'] > last_high:
                    self.df.at[self.df.index[i], 'bos'] = True
                last_high = current_high
                
            if not np.isnan(current_low):
                if trend == 1 and last_low and self.df.iloc[i]['low'] < last_low:
                    self.df.at[self.df.index[i], 'choch'] = True
                    trend = -1
                elif trend == -1 and last_low and self.df.iloc[i]['low'] < last_low:
                    self.df.at[self.df.index[i], 'bos'] = True
                last_low = current_low
                
        return self.df

    def find_fvgs(self):
        """
        Detects Fair Value Gaps (FVG) / Imbalances.
        """
        self.df['fvg'] = None
        for i in range(2, len(self.df)):
            # Bullish FVG (Gap between Low of candle i and High of candle i-2)
            if self.df.iloc[i]['low'] > self.df.iloc[i-2]['high']:
                self.df.at[self.df.index[i-1], 'fvg'] = f"Bullish FVG: {self.df.iloc[i-2]['high']}-{self.df.iloc[i]['low']}"
            # Bearish FVG (Gap between High of candle i and Low of candle i-2)
            elif self.df.iloc[i]['high'] < self.df.iloc[i-2]['low']:
                self.df.at[self.df.index[i-1], 'fvg'] = f"Bearish FVG: {self.df.iloc[i]['high']}-{self.df.iloc[i-2]['low']}"
        return self.df

    def find_order_blocks(self):
        """
        Identifies Order Blocks (OB) based on impulsive moves that break structure.
        """
        self.df['order_block'] = None
        self.find_fvgs() # Ensure FVGs are detected first
        
        for i in range(1, len(self.df)):
            if self.df.iloc[i]['bos'] or self.df.iloc[i]['choch']:
                if self.df.iloc[i]['close'] > self.df.iloc[i-1]['close']: # Bullish
                    for j in range(i-1, max(0, i-5), -1): # Look back up to 5 candles
                        if self.df.iloc[j]['close'] < self.df.iloc[j]['open']:
                            # High probability if followed by FVG and has Displacement
                            has_fvg = any(self.df.iloc[j+1 : j+4]['fvg'].notna())
                            has_disp = any(self.df.iloc[j+1 : j+4]['displacement'])
                            prob = "High" if (has_fvg and has_disp) else "Med"
                            self.df.at[self.df.index[i], 'order_block'] = f"{prob} Prob Bullish OB at {self.df.iloc[j]['low']}-{self.df.iloc[j]['high']}"
                            break
                else: # Bearish
                    for j in range(i-1, max(0, i-5), -1):
                        if self.df.iloc[j]['close'] > self.df.iloc[j]['open']:
                            has_fvg = any(self.df.iloc[j+1 : j+4]['fvg'].notna())
                            has_disp = any(self.df.iloc[j+1 : j+4]['displacement'])
                            prob = "High" if (has_fvg and has_disp) else "Med"
                            self.df.at[self.df.index[i], 'order_block'] = f"{prob} Prob Bearish OB at {self.df.iloc[j]['low']}-{self.df.iloc[j]['high']}"
                            break
        return self.df

# --- Demo Script ---
if __name__ == "__main__":
    # Create some dummy XAUUSD data
    np.random.seed(42)
    dates = pd.date_range(start="2024-01-01", periods=100, freq='H')
    data = pd.DataFrame({
        'open': np.random.uniform(2000, 2050, 100),
        'high': np.random.uniform(2050, 2100, 100),
        'low': np.random.uniform(1950, 2000, 100),
        'close': np.random.uniform(2000, 2050, 100),
    }, index=dates)
    
    # Ensure high is max and low is min
    data['high'] = data[['open', 'close', 'high']].max(axis=1)
    data['low'] = data[['open', 'close', 'low']].min(axis=1)

    engine = SMCEngine(data)
    engine.find_swing_points()
    engine.detect_structure()
    engine.find_order_blocks()
    
    print("--- SMC Detection Results (Sample) ---")
    results = engine.df[engine.df['bos'] | engine.df['choch'] | engine.df['order_block'].notna()]
    if results.empty:
        print("No structure breaks found in this sample. (Normal for random data)")
    else:
        print(results[['swing_high', 'swing_low', 'bos', 'choch', 'order_block']].tail(10))
