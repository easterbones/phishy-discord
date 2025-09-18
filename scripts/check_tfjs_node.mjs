(async () => {
  try {
    console.log('Importing @tensorflow/tfjs-node...');
    const tfModule = await import('@tensorflow/tfjs-node');
    const tf = tfModule && (tfModule.default || tfModule);
    console.log('Imported.');
    try {
      const backend = tf.getBackend ? tf.getBackend() : 'unknown';
      console.log('tf.getBackend():', backend);
    } catch (e) {
      console.warn('Could not call tf.getBackend():', e && e.message ? e.message : e);
    }
    console.log('tf.node present?', !!(tf && tf.node));
    console.log('tf.node.decodeImage available?', !!(tf && tf.node && typeof tf.node.decodeImage === 'function'));
    // Try to create a small tensor to exercise the backend
    try {
      const t = tf.tensor([1, 2, 3]);
      console.log('Created tensor shape:', t.shape, 'dtype:', t.dtype);
      t.dispose();
    } catch (e) {
      console.error('Error creating tensor:', e && e.message ? e.message : e);
    }
    process.exit(0);
  } catch (err) {
    console.error('Import failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();