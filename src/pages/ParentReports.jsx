import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import Shell from '@/components/Shell';
import Header from '@/components/Header';
import { Card } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatMoney } from '@/lib/cq';
import { format, subDays, startOfDay } from 'date-fns';
import { TrendingUp, Coins, CheckCircle2 } from 'lucide-react';

const CHART_COLORS = ['hsl(18 92% 62%)','hsl(235 55% 20%)','hsl(44 95% 62%)','hsl(152 55% 42%)','hsl(280 55% 55%)'];

export default function ParentReports() {
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => api.auth.me() });
  const { data: family } = useQuery({
    queryKey: ['family', me?.family_id],
    queryFn: () => api.entities.Family.filter({ id: me.family_id }).then(r => r[0]),
    enabled: !!me?.family_id,
  });
  const { data: kids = [] } = useQuery({
    queryKey: ['kids', me?.family_id],
    queryFn: () => api.entities.User.filter({ family_id: me.family_id, app_role: 'kid' }),
    enabled: !!me?.family_id,
  });
  const { data: claims = [] } = useQuery({
    queryKey: ['claimsReports', me?.family_id],
    queryFn: () => api.entities.ChoreClaim.filter({ family_id: me.family_id, status: 'approved' }),
    enabled: !!me?.family_id,
  });

  const sym = family?.currency_symbol || '$';
  const today = startOfDay(new Date());

  // Last 7 days
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = subDays(today, 6 - i);
    const iso = format(d, 'yyyy-MM-dd');
    const dayClaims = claims.filter(c => (c.claim_date || c.created_date || '').slice(0, 10) === iso);
    return {
      day: format(d, 'EEE'),
      chores: dayClaims.length,
      earned: dayClaims.reduce((s, c) => s + (c.paid_amount || 0), 0),
    };
  });

  const weekClaims = claims.filter(c => new Date(c.created_date) >= subDays(new Date(), 7));
  const weekChores = weekClaims.length;
  const weekEarned = weekClaims.reduce((s, c) => s + (c.paid_amount || 0), 0);

  // Per-kid breakdown
  const kidData = kids.map(k => {
    const kc = weekClaims.filter(c => c.kid_email === k.email);
    return {
      name: k.display_name || k.full_name || 'Kid',
      chores: kc.length,
      earned: kc.reduce((s, c) => s + (c.paid_amount || 0), 0),
    };
  });

  const allTimeEarned = claims.reduce((s, c) => s + (c.paid_amount || 0), 0);

  return (
    <Shell role="parent">
      <Header title="Reports" />

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat icon={CheckCircle2} label="This week" value={weekChores} sub="chores" />
        <Stat icon={Coins} label="Paid out" value={formatMoney(weekEarned, sym)} sub="this week" />
        <Stat icon={TrendingUp} label="All time" value={formatMoney(allTimeEarned, sym)} sub="total" />
      </div>

      <Card className="p-5 mb-4">
        <h2 className="font-display text-lg font-semibold mb-3">Daily activity</h2>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer>
            <BarChart data={dailyData}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={24} />
              <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="chores" fill="hsl(var(--secondary))" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {kidData.length > 0 && (
        <Card className="p-5">
          <h2 className="font-display text-lg font-semibold mb-3">By kid (this week)</h2>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={kidData.filter(k => k.chores > 0)} dataKey="chores" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => `${e.name}: ${e.chores}`}>
                  {kidData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {kidData.map(k => (
              <div key={k.name} className="flex items-center justify-between text-sm">
                <span>{k.name}</span>
                <span className="text-muted-foreground">{k.chores} chores · {formatMoney(k.earned, sym)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </Shell>
  );
}

const Stat = ({ icon: Icon, label, value, sub }) => (
  <Card className="p-3">
    <Icon className="w-4 h-4 text-primary mb-1" />
    <div className="font-display text-xl font-bold leading-none">{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wide mt-1">{label} · {sub}</div>
  </Card>
);