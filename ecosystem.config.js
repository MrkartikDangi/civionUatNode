module.exports = {
  apps: [
    {
      name: "constructionapp_backend",
      script: "./bin/www.js",
      instances: 1,
      autorestart: false,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
