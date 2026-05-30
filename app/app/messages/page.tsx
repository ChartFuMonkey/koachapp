import { createClient } from "@/lib/supabase/server";
import ChatView from "@/components/client-shell/chat-view";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return <ChatView userId={user.id} />;
}
