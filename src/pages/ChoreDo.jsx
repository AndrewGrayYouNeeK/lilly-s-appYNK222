import React, { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import Shell from '@/components/Shell';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, X, RefreshCw, CheckCircle2 } from 'lucide-react';
import { notifyParents } from '@/lib/notify';
import ClaimCommentThread from '@/components/ClaimCommentThread';
import { toast } from 'sonner';

export default function ChoreDo() {
  const { id } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const beforeInput = useRef(null);
  const afterInput = useRef(null);
  const [uploading, setUploading] = useState(false);

  const { data: claim, refetch } = useQuery({
    queryKey: ['claim', id],
    queryFn: () => base44.entities.ChoreClaim.filter({ id }).then(r => r[0]),
  });
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  if (!claim) return <Shell role="kid"><div className="text-center py-10 text-muted-foreground">Loading…</div></Shell>;

  const needsPhoto = claim.requires_photo !== false;

  const markDoneNoPhoto = async () => {
    await base44.entities.ChoreClaim.update(id, { status: 'submitted' });
    qc.invalidateQueries({ queryKey: ['myClaims'] });
    qc.invalidateQueries({ queryKey: ['pending'] });
    await notifyParents({
      family_id: claim.family_id, type: 'submission', emoji: '📮',
      title: `${claim.kid_name} submitted: ${claim.chore_title}`,
      body: 'Tap to review and approve',
      link: '/parent/approvals',
    });
    toast.success('Submitted for approval! 🎉');
    setTimeout(() => nav('/kid'), 900);
  };

  const uploadPhoto = async (file, which) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const update = which === 'before'
        ? { before_photo_url: file_url, status: 'before_done' }
        : { after_photo_url: file_url, status: 'submitted', ai_verdict: 'pending' };
      await base44.entities.ChoreClaim.update(id, update);
      await refetch();
      qc.invalidateQueries({ queryKey: ['myClaims'] });
      qc.invalidateQueries({ queryKey: ['pending'] });
      if (which === 'after') {
        await notifyParents({
          family_id: claim.family_id, type: 'submission', emoji: '📮',
          title: `${claim.kid_name} submitted: ${claim.chore_title}`,
          body: 'Tap to review and approve',
          link: '/parent/approvals',
        });
        toast.success('Submitted for approval! 🎉');
        setTimeout(() => nav('/kid'), 900);
      } else {
        toast.success('Before photo saved. Now go do the chore!');
      }
    } catch (e) {
      toast.error('Upload failed, try again');
    }
    setUploading(false);
  };

  const cancel = async () => {
    if (!confirm('Cancel this quest?')) return;
    await base44.entities.ChoreClaim.delete(id);
    qc.invalidateQueries({ queryKey: ['myClaims'] });
    nav('/kid');
  };

  const step = claim.status === 'claimed' || (claim.status === 'redo' && !claim.before_photo_url) ? 1
    : claim.status === 'before_done' || claim.status === 'redo' ? 2
    : 3;

  return (
    <Shell role="kid">
      <button onClick={() => nav(-1)} className="text-sm text-muted-foreground mb-4">← Back</button>

      <Card className="p-5 mb-4">
        <div className="flex items-center gap-3">
          <div className="text-4xl">{claim.chore_emoji}</div>
          <div className="flex-1">
            <div className="font-display text-2xl font-bold">{claim.chore_title}</div>
            <div className="text-sm text-muted-foreground">Quest in progress</div>
          </div>
        </div>
        {claim.status === 'redo' && claim.review_comment && (
          <div className="mt-4 p-3 rounded-xl bg-accent/40 text-sm">
            <div className="text-xs font-semibold uppercase tracking-wider mb-1">Parent note</div>
            {claim.review_comment}
          </div>
        )}
      </Card>

      {!needsPhoto && claim.status !== 'submitted' && claim.status !== 'approved' && (
        <Card className="p-6 mb-4 border-2 border-success/30 bg-success/5 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
          <div className="font-display text-xl font-bold mb-1">No photo needed</div>
          <p className="text-sm text-muted-foreground mb-4">Do the chore, then mark it done and your parent will review.</p>
          <Button onClick={markDoneNoPhoto} className="w-full h-12 rounded-xl text-base bg-success hover:bg-success/90 text-success-foreground">
            Mark as done
          </Button>
        </Card>
      )}

      {!needsPhoto && (claim.status === 'submitted' || claim.status === 'approved') && (
        <Card className="p-6 mb-4 text-center">
          <CheckCircle2 className="w-10 h-10 text-success mx-auto mb-2" />
          <div className="font-display text-lg font-bold">
            {claim.status === 'approved' ? 'Approved! 🎉' : 'Waiting for parent review…'}
          </div>
        </Card>
      )}

      {needsPhoto && <>
      {/* Step 1 — BEFORE */}
      <StepCard
        num={1}
        title="Show the mess"
        subtitle="Take a before photo of the starting state"
        active={step === 1}
        done={!!claim.before_photo_url && step > 1}
        photoUrl={claim.before_photo_url}
        tone="secondary"
        onPick={() => beforeInput.current?.click()}
        uploading={uploading && step === 1}
      />
      <input ref={beforeInput} type="file" accept="image/*" capture="environment" hidden
        onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'before')} />

      {/* Step 2 — do it */}
      <Card className={`p-5 mb-4 transition ${step === 2 ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-3">
          <StepBadge num={2} active={step === 2} />
          <div>
            <div className="font-display text-lg font-bold">Do the chore</div>
            <div className="text-sm text-muted-foreground">Take your time. Do a great job! 💪</div>
          </div>
        </div>
      </Card>

      {/* Step 3 — AFTER */}
      <StepCard
        num={3}
        title="Show the result"
        subtitle="Take an after photo so your parent can approve"
        active={step === 2 || step === 3}
        done={claim.status === 'submitted' || claim.status === 'approved'}
        photoUrl={claim.after_photo_url}
        tone="success"
        onPick={() => afterInput.current?.click()}
        uploading={uploading && step >= 2}
        disabled={step < 2}
      />
      <input ref={afterInput} type="file" accept="image/*" capture="environment" hidden
        onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0], 'after')} />
      </>}

      {claim.status !== 'submitted' && claim.status !== 'approved' && (
        <button onClick={cancel} className="w-full mt-2 text-xs text-muted-foreground flex items-center justify-center gap-1 py-2">
          <X className="w-3 h-3" /> Cancel quest
        </button>
      )}

      {me && (
        <Card className="p-4 mt-4">
          <ClaimCommentThread claim={claim} me={me} />
        </Card>
      )}
    </Shell>
  );
}

const StepBadge = ({ num, active }) => (
  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
    {num}
  </div>
);

const StepCard = ({ num, title, subtitle, active, done, photoUrl, tone, onPick, uploading, disabled }) => {
  const toneBg = tone === 'secondary' ? 'bg-secondary/10 border-secondary/30' : 'bg-success/10 border-success/30';
  return (
    <Card className={`p-5 mb-4 border-2 transition ${active && !done ? toneBg : ''} ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <StepBadge num={num} active={active && !done} />
        <div className="flex-1">
          <div className="font-display text-lg font-bold">{title}</div>
          <div className="text-sm text-muted-foreground mb-3">{subtitle}</div>

          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="" className="w-full aspect-video object-cover rounded-xl" />
              {!done && (
                <Button onClick={onPick} size="sm" variant="secondary" className="absolute bottom-2 right-2 rounded-full">
                  <RefreshCw className="w-3 h-3 mr-1" /> Retake
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={onPick} disabled={disabled || uploading} className="w-full h-14 rounded-xl text-base">
              {uploading ? <Upload className="w-5 h-5 mr-2 animate-pulse" /> : <Camera className="w-5 h-5 mr-2" />}
              {uploading ? 'Uploading…' : 'Take photo'}
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};