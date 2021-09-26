module.exports = {
  apps: [
    {
      name: 'flashcards-server',
      instances: 2,
      script: './dist/index.js',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
