import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const claimId = body?.claimId || body?.data?.id || body?.event?.entity_id;
    if (!claimId) return Response.json({ error: 'claimId required' }, { status: 400 });

    const claim = await base44.asServiceRole.entities.ChoreClaim.filter({ id: claimId }).then(r => r[0]);
    if (!claim) return Response.json({ error: 'Claim not found' }, { status: 404 });
    if (!claim.before_photo_url || !claim.after_photo_url) {
      return Response.json({ skipped: 'missing photos' });
    }
    if (claim.ai_verdict && claim.ai_verdict !== 'pending') {
      return Response.json({ skipped: 'already verified' });
    }

    const prompt = `You are reviewing a child's chore submission. The chore was: "${claim.chore_title}".
Two photos are attached: the FIRST shows the BEFORE state, the SECOND shows the AFTER state.

Evaluate whether the chore appears genuinely completed by comparing the two images.
Consider: visible improvement, effort, whether the after photo matches the task, and signs of gaming (e.g. identical photos, unrelated scenes, staged mess).

Return strict JSON.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [claim.before_photo_url, claim.after_photo_url],
      response_json_schema: {
        type: 'object',
        properties: {
          verdict: { type: 'string', enum: ['looks_good', 'needs_review', 'suspicious'] },
          score: { type: 'number', description: '0-100 quality/effort score' },
          reasoning: { type: 'string', description: 'one short sentence for the parent' },
        },
        required: ['verdict', 'score', 'reasoning'],
      },
    });

    await base44.asServiceRole.entities.ChoreClaim.update(claimId, {
      ai_verdict: result.verdict,
      ai_score: Math.round(result.score || 0),
      ai_reasoning: result.reasoning,
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});