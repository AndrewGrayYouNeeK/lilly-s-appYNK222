import { supabase } from '@/lib/supabase';

const TABLE_MAP = {
  Family: 'families',
  Chore: 'chores',
  ChoreClaim: 'chore_claims',
  FamilyQuest: 'family_quests',
  Allowance: 'allowances',
  WalletTransaction: 'wallet_transactions',
  FamilyWalletTransaction: 'family_wallet_transactions',
  SavingsGoal: 'savings_goals',
  CashoutRequest: 'cashout_requests',
  ShopItem: 'shop_items',
  Purchase: 'purchases',
  Badge: 'badges',
  UserBadge: 'user_badges',
  Streak: 'streaks',
  Notification: 'notifications',
  Message: 'messages',
  User: 'profiles',
};

function createEntity(entityName) {
  const table = TABLE_MAP[entityName];
  if (!table) throw new Error(`Unknown entity: ${entityName}`);

  return {
    async filter(filters = {}, sortField, limit) {
      let query = supabase.from(table).select('*');
      for (const [key, value] of Object.entries(filters)) {
        if (value === null) query = query.is(key, null);
        else query = query.eq(key, value);
      }
      if (sortField) {
        const desc = sortField.startsWith('-');
        const col = desc ? sortField.slice(1) : sortField;
        query = query.order(col, { ascending: !desc });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },

    async create(row) {
      const { data, error } = await supabase.from(table).insert(row).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, row) {
      const { data, error } = await supabase.from(table).update(row).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

async function getProfile() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw Object.assign(new Error('Not authenticated'), { status: 401 });
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  if (profileError) throw profileError;
  return {
    id: user.id,
    email: user.email,
    full_name: profile.full_name || profile.display_name || user.email?.split('@')[0],
    display_name: profile.display_name,
    app_role: profile.app_role,
    family_id: profile.family_id,
    avatar_emoji: profile.avatar_emoji,
    age: profile.age,
    role: user.app_metadata?.role,
  };
}

const auth = {
  async me() {
    return getProfile();
  },

  async updateMe(fields) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw Object.assign(new Error('Not authenticated'), { status: 401 });
    const { data, error } = await supabase
      .from('profiles')
      .update(fields)
      .eq('id', user.id)
      .select()
      .single();
    if (error) throw error;
    return { ...user, ...data, email: user.email };
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = '/login';
  },

  redirectToLogin(returnUrl) {
    const params = returnUrl ? `?redirect=${encodeURIComponent(returnUrl)}` : '';
    window.location.href = `/login${params}`;
  },
};

const integrations = {
  Core: {
    async InvokeLLM({ prompt, file_urls, response_json_schema }) {
      const { data, error } = await supabase.functions.invoke('invoke-llm', {
        body: { prompt, file_urls, response_json_schema },
      });
      if (error) throw error;
      return data;
    },

    async UploadFile({ file }) {
      const ext = file.name?.split('.').pop() || 'jpg';
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('chore-photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('chore-photos').getPublicUrl(path);
      return { file_url: publicUrl };
    },
  },
};

const coachSubscriptions = new Map();

const agents = {
  async createConversation({ agent_name, metadata }) {
    const me = await auth.me();
    const { data, error } = await supabase
      .from('coach_conversations')
      .insert({
        user_id: me.id,
        family_id: me.family_id,
        title: metadata?.name || `Coach · ${new Date().toLocaleDateString()}`,
      })
      .select()
      .single();
    if (error) throw error;
    return { id: data.id, messages: [] };
  },

  subscribeToConversation(conversationId, callback) {
    const channel = supabase
      .channel(`coach:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'coach_messages', filter: `conversation_id=eq.${conversationId}` },
        async () => {
          const { data } = await supabase
            .from('coach_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_date', { ascending: true });
          callback({ messages: (data || []).map(m => ({ role: m.role, content: m.content, is_streaming: m.is_streaming })) });
        }
      )
      .subscribe();

    coachSubscriptions.set(conversationId, channel);
    return () => {
      channel.unsubscribe();
      coachSubscriptions.delete(conversationId);
    };
  },

  async addMessage(conversation, { role, content }) {
    const convId = typeof conversation === 'string' ? conversation : conversation.id;
    const { error: insertError } = await supabase.from('coach_messages').insert({
      conversation_id: convId,
      role,
      content,
      is_streaming: false,
    });
    if (insertError) throw insertError;

    if (role === 'user') {
      const { data, error } = await supabase.functions.invoke('chore-coach', {
        body: { conversation_id: convId, message: content },
      });
      if (error) throw error;
      if (data?.reply) {
        await supabase.from('coach_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: data.reply,
          is_streaming: false,
        });
      }
    }
  },
};

const entities = new Proxy(
  {},
  {
    get(_, entityName) {
      return createEntity(entityName);
    },
  }
);

export const api = { auth, entities, integrations, agents };
