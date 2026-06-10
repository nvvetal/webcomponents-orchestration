const path = require('path');
const { createServer } = require('./helpers/server');
const chromedriverPath = require('chromedriver').path;

process.env.TS_NODE_TRANSPILE_ONLY = 'true';
process.env.TS_NODE_PROJECT = path.join(__dirname, 'tsconfig.json');

const PORT = 8092;
const headed = process.env.WDIO_HEADED === 'true';
let server;

const chromeArgs = [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--window-size=1280,800',
];
if (!headed) {
    chromeArgs.unshift('--headless=new');
}

exports.config = {
    runner: 'local',
    specs: ['./specs/**/*.test.ts'],
    exclude: [],
    maxInstances: 1,

    autoCompileOpts: {
        autoCompile: true,
        tsNodeOpts: {
            transpileOnly: true,
            project: path.join(__dirname, 'tsconfig.json'),
        },
    },

    capabilities: [{
        browserName: 'chrome',
        'goog:chromeOptions': {
            args: chromeArgs,
        },
        'wdio:chromedriverOptions': {
            binary: chromedriverPath,
        },
    }],

    logLevel: 'warn',
    bail: 0,
    baseUrl: `http://127.0.0.1:${PORT}`,
    waitforTimeout: 5000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    framework: 'mocha',
    reporters: ['spec'],
    mochaOpts: {
        ui: 'bdd',
        timeout: 30000,
    },

    onPrepare: async function () {
        const root = path.resolve(__dirname, '..');
        server = await createServer(root, PORT);
    },

    onComplete: function () {
        if (server) server.close();
    },
};
