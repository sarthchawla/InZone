import { Router, type Router as RouterType } from 'express';

export const webhooksRouter: RouterType = Router();

/**
 * Slack Workflow Webhook
 * Receives form data from Slack Workflow Builder when user triggers
 * the InZone task creation workflow via emoji reaction.
 *
 * Phase 1: Log payload for analysis
 * Phase 2: Parse and create todo
 */
webhooksRouter.post('/slack-workflow', (req, res) => {
  console.log('\n========================================');
  console.log('=== Slack Workflow Payload Received ===');
  console.log('========================================');
  console.log('Timestamp:', new Date().toISOString());
  console.log('\n--- Headers ---');
  console.log(JSON.stringify(req.headers, null, 2));
  console.log('\n--- Body ---');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('========================================\n');

  res.status(200).json({
    success: true,
    message: 'Payload received',
    timestamp: new Date().toISOString(),
  });
});
