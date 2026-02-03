import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, Play, Pause, Trash2, Calendar, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface VoiceMemo {
    id: string;
    created_at: string;
    storage_path: string;
    duration: number;
    trade_id?: string;
}

const VoiceMemosPage = () => {
    const [memos, setMemos] = useState<VoiceMemo[]>([]);
    const [loading, setLoading] = useState(true);
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [audioElements, setAudioElements] = useState<Record<string, HTMLAudioElement>>({});

    useEffect(() => {
        fetchMemos();
    }, []);

    const fetchMemos = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from("voice_memos")
                .select("*")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setMemos(data || []);
        } catch (error: any) {
            toast.error("Failed to load voice memos");
        } finally {
            setLoading(false);
        }
    };

    const getAudioUrl = async (storagePath: string) => {
        const { data } = await supabase.storage
            .from("voice-memos")
            .createSignedUrl(storagePath, 3600);
        return data?.signedUrl || null;
    };

    const playMemo = async (memo: VoiceMemo) => {
        if (playingId === memo.id) {
            audioElements[memo.id]?.pause();
            setPlayingId(null);
            return;
        }

        // Stop any currently playing audio
        if (playingId && audioElements[playingId]) {
            audioElements[playingId].pause();
        }

        if (!audioElements[memo.id]) {
            const url = await getAudioUrl(memo.storage_path);
            if (!url) {
                toast.error("Failed to load audio");
                return;
            }

            const audio = new Audio(url);
            audio.onended = () => setPlayingId(null);
            setAudioElements(prev => ({ ...prev, [memo.id]: audio }));
            audio.play();
        } else {
            audioElements[memo.id].play();
        }

        setPlayingId(memo.id);
    };

    const deleteMemo = async (memo: VoiceMemo) => {
        if (!confirm("Delete this voice memo?")) return;

        try {
            // Delete from storage
            await supabase.storage
                .from("voice-memos")
                .remove([memo.storage_path]);

            // Delete from database
            await supabase
                .from("voice_memos")
                .delete()
                .eq("id", memo.id);

            toast.success("Voice memo deleted");
            fetchMemos();
        } catch (error) {
            toast.error("Failed to delete memo");
        }
    };

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Layout>
            <div className="container mx-auto p-4 md:p-6 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Mic className="h-8 w-8 text-primary" />
                        Voice Memos
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        All your saved voice notes in one place
                    </p>
                </div>

                {loading ? (
                    <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                            Loading your voice memos...
                        </CardContent>
                    </Card>
                ) : memos.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center">
                            <Mic className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <h3 className="text-lg font-semibold mb-2">No voice memos yet</h3>
                            <p className="text-muted-foreground mb-4">
                                Record your first voice memo from the Dashboard
                            </p>
                            <Button onClick={() => window.location.href = "/dashboard"}>
                                Go to Dashboard
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {memos.map((memo) => (
                            <Card key={memo.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <Button
                                                variant={playingId === memo.id ? "default" : "outline"}
                                                size="icon"
                                                onClick={() => playMemo(memo)}
                                            >
                                                {playingId === memo.id ? (
                                                    <Pause className="h-4 w-4" />
                                                ) : (
                                                    <Play className="h-4 w-4" />
                                                )}
                                            </Button>

                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="font-medium">
                                                        Voice Memo
                                                    </span>
                                                    {memo.trade_id && (
                                                        <Badge variant="secondary" className="text-xs">
                                                            Linked to Trade
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(memo.created_at), "MMM d, yyyy")}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {formatDuration(memo.duration)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => deleteMemo(memo)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default VoiceMemosPage;
