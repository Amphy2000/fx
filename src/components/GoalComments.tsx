import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface GoalCommentsProps {
  goalId: string;
  checkInId?: string;
}

export default function GoalComments({ goalId, checkInId }: GoalCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    loadComments();
    getCurrentUser();
    setupRealtimeSubscription();
  }, [goalId, checkInId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadComments = async () => {
    try {
      let query = supabase
        .from('goal_comments')
        .select(`
          *,
          author:profiles!goal_comments_author_id_fkey(full_name, email)
        `)
        .eq('goal_id', goalId)
        .order('created_at', { ascending: true });

      if (checkInId) {
        query = query.eq('check_in_id', checkInId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast.error("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel(`comments:${goalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'goal_comments',
          filter: `goal_id=eq.${goalId}`
        },
        () => loadComments()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || posting) return;

    setPosting(true);
    try {
      const { error } = await supabase
        .from('goal_comments')
        .insert({
          goal_id: goalId,
          check_in_id: checkInId,
          author_id: currentUserId,
          content: newComment.trim(),
        });

      if (error) throw error;
      setNewComment("");
      toast.success("Comment posted!");
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error("Failed to post comment");
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">Loading comments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment List */}
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {comments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No comments yet. Be the first to comment!
            </p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3 p-3 rounded-lg border">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {(comment.author?.full_name || comment.author?.email || '?')
                      .substring(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">
                      {comment.author?.full_name || comment.author?.email}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            rows={3}
          />
          <Button
            onClick={handlePostComment}
            disabled={posting || !newComment.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}