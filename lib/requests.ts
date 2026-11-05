import { getSupabase } from './supabase';
import { RequestType } from './types';

export const PAGE_SIZE = 25;
export const COMMENT_PAGE_SIZE = 50;
const summaryColumns = 'id,user_id,email,phone,description,harassment_type,severity_level,status,created_at,comments(count)';

type Row = Record<string, any>;
function mapRequest(row: Row): RequestType {
  return {
    id: row.id, _id: row.id, userId: row.user_id, title: '',
    email: row.email, phone: row.phone, userAddress: row.user_address || '',
    accusedName: row.accused_name || '', accusedAddress: row.accused_address || '',
    accusedPhone: row.accused_phone || '', harassmentType: row.harassment_type,
    severityLevel: row.severity_level, description: row.description, status: row.status,
    createdAt: row.created_at, comments: [], commentCount: row.comments?.[0]?.count || 0,
    evidence: [
      ...(row.screenshot_url ? [{ type: 'screenshot' as const, url: row.screenshot_url }] : []),
      ...(row.video_url ? [{ type: 'video' as const, url: row.video_url }] : []),
    ],
  };
}

export async function listRequests(page = 0, search = '', admin = false) {
  let query = getSupabase().from('support_requests').select(summaryColumns, { count: 'exact' })
    .order('created_at', { ascending: false }).order('id', { ascending: false });
  if (!admin) {
    const { data, error } = await getSupabase().auth.getUser();
    if (error || !data.user) throw new Error('Please sign in again.');
    query = query.eq('user_id', data.user.id);
  }
  const term = search.replace(/[^a-zA-Z0-9@+.\s-]/g, '').trim().slice(0, 100);
  if (term) {
    const filters = [`phone.ilike.%${term}%`, `email.ilike.%${term}%`];
    if (/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(term)) {
      filters.push(`id.eq.${term}`, `user_id.eq.${term}`);
    }
    query = query.or(filters.join(','));
  }
  const { data, error, count } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  if (error) throw error;
  return { requests: (data || []).map(mapRequest), count: count || 0 };
}

export async function getRequest(id: string) {
  const { data, error } = await getSupabase().from('support_requests').select('*').eq('id', id).single();
  if (error) throw error;
  return mapRequest(data);
}

export async function listComments(requestId: string, page = 0, signal?: AbortSignal) {
  let query = getSupabase().from('comments')
    .select('id,sender,content,created_at', { count: 'exact' }).eq('request_id', requestId)
    .order('created_at', { ascending: false }).order('id', { ascending: false })
    .range(page * COMMENT_PAGE_SIZE, (page + 1) * COMMENT_PAGE_SIZE - 1);
  if (signal) query = query.abortSignal(signal);
  const { data, error, count } = await query;
  if (error) throw error;
  return {
    comments: (data || []).map(row => ({
      id: row.id, sender: row.sender as 'admin' | 'user', content: row.content, timestamp: row.created_at,
    })),
    count: count || 0,
  };
}

export async function addComment(requestId: string, content: string) {
  const { error } = await getSupabase().from('comments').insert({ request_id: requestId, content: content.trim() });
  if (error) throw error;
}

export async function updateStatus(id: string, status: RequestType['status']) {
  const { error } = await getSupabase().from('support_requests').update({ status }).eq('id', id).select('id').single();
  if (error) throw error;
}

export interface NewRequestData {
  userAddress: string; accusedAddress: string; accusedName: string; accusedPhone: string;
  harassmentType: string; severityLevel: string; description: string;
  screenshotEvidence: string; videoEvidence: string;
}
export async function createRequest(form: NewRequestData) {
  for (const value of [form.screenshotEvidence, form.videoEvidence]) {
    if (value && !/^https?:$/.test(new URL(value).protocol)) throw new Error('Evidence links must use HTTP or HTTPS.');
  }
  const { error } = await getSupabase().from('support_requests').insert({
    user_address: form.userAddress.trim(), accused_address: form.accusedAddress.trim(),
    accused_name: form.accusedName.trim(), accused_phone: form.accusedPhone.trim(),
    harassment_type: form.harassmentType, severity_level: form.severityLevel,
    description: form.description.trim(), screenshot_url: form.screenshotEvidence.trim() || null,
    video_url: form.videoEvidence.trim() || null,
  });
  if (error) throw error;
}
