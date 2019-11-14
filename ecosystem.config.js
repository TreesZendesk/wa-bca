module.exports = {
  apps : [{
    name: 'app',
    script: './bin/www',

    // Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/
    args: 'one two',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }],

  deploy : {
    staging : {
      user : 'trees',
      host : '192.168.1.94',
      ref  : 'origin/master',
      repo : 'git@github.com:TreesZendesk/wa-bca.git',
      path : '/home/trees/wa-bca',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env development'
    }
  }
};
