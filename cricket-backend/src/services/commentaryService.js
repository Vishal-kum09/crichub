// src/services/commentaryService.js
const { GoogleAuth } = require('google-auth-library');

// .env se variables fetch karein
const COMMENTARY_API_URL = process.env.COMMENTARY_API_URL || 'https://ai-commentary-service-zztcl7ejrq-nw.a.run.app';
const COMMENTARY_AUDIENCE = process.env.COMMENTARY_AUDIENCE || 'https://ai-commentary-service-zztcl7ejrq-nw.a.run.app';

// Google Auth Client setup
const auth = new GoogleAuth();

exports.triggerDeliveryCommentary = async (matchId, deliveryId, userId) => {
  try {
    const client = await auth.getIdTokenClient(COMMENTARY_AUDIENCE);

    const response = await client.request({
      url: `${COMMENTARY_API_URL}/commentary/trigger-delivery`,
      method: 'POST',
      data: {
        match_id: matchId,
        delivery_id: deliveryId,
        live_task: process.env.COMMENTARY_DEFAULT_LIVE_TASK || 'live_ball_extended',
        over_task: 'end_of_over',
        style: process.env.COMMENTARY_DEFAULT_STYLE || 'broadcast_english',
        save_database: true,
        force_regenerate: false,
        include_over_summary: true,
        include_innings_break_summary: true,
        delay_seconds: parseInt(process.env.COMMENTARY_DELAY_SECONDS) || 3,
        created_by: userId
      }
    });

    console.log('✅ AI Commentary Triggered:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to trigger AI Commentary:', error.message);
    throw error;
  }
};

exports.invalidateDeliveryCommentary = async (matchId, deliveryId) => {
  try {
    const client = await auth.getIdTokenClient(COMMENTARY_AUDIENCE);
    const response = await client.request({
      url: `${COMMENTARY_API_URL}/commentary/invalidate-delivery`,
      method: 'POST',
      data: {
        match_id: matchId,
        delivery_id: deliveryId,
        reason: 'delivery_undone'
      }
    });

    console.log('AI Commentary invalidated:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to invalidate AI Commentary:', error.message);
    throw error;
  }
};

exports.generateVoicePreview = async (settings) => {
  const targetUrl = 'https://commentary-audio-worker-106171733624.europe-west2.run.app/api/voice-preview';

  try {
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Audio-API-Key': process.env.AUDIO_API_KEY, 
      },
      body: JSON.stringify(settings)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Audio Service returned an error');
    }

    return data;
  } catch (error) {
    throw new Error('Failed to communicate with Audio Commentary Service');
  }
};