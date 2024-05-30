import { sequelize } from './db.js';
import History from './models/history.model.js';
import {config} from './js/config.js';
import pkg from 'express';
const express = pkg;
const app = express();
import * as path from 'path';
import * as fs from 'fs';
import bodyParser from 'body-parser';
import { spawn } from 'child_process';
app.locals.servers = config.servers;
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const __dirname = path.dirname('');

app.get('/', (req, res) => {
    res.sendFile('/index.html', { root: __dirname });
});

app.get('/interface.js', (req, res) => {
    res.sendFile('/js/interface.js',  { root: __dirname });
});

app.get('/style.css', (req, res) => {
    res.sendFile('/styles/style.css', { root: __dirname });
})

app.get('/api/getConfig', (req, res) => {
    success(res, {data: req.app.locals.servers});
});

app.get('/api/getLogs', async (req, res, next) => {
    const required = checkRequiredProperties(['query.servers', 'query.logPath'], req, next);
    if (!required.ok) {
        return false;
    }

    const date = new Date();
    const dateStr = date.toLocaleString();
    const configServers = req.app.locals.servers;
    const logPath = req.query.logPath;
    const logSearch = req.query.logSearch ? ` | grep -B 3 -A 3 --group-separator ---------- ${req.query.logSearch}` : '';
    const reqServers = req.query.servers.split(',');
    const command = `less ${logPath}${logSearch}`;
    const promises = [];
    if (!reqServers) {
        return false;
    }
    const meta = {
        endpoint: 'getLogs',
        params: req.query,
        servers: reqServers
    };
    promises.push(runCommand(`:> ./output/log.txt`));
    reqServers.forEach(async name => {
        const server = configServers.find(server => server.name === name);
        promises.push(runCommand(`ssh ${server.user}@${server.hostname} "${command} 2>/dev/null"`, {
            header: `<span id="header-${server.name}" class="log-header">Output from ${server.name}</span><div class="log-output">`,
            footer: `</div>`,
            separator: `<span class="match-separator"></span>`,
            outputFile: './output/log.txt'
        }));
    });

    Promise.all(promises).then(() => {
        fs.readFile('./output/log.txt', 'utf8', function(err, data) {
            if (err) throw err;
            success(res, {meta, data});
            appendHistory(meta);
        });
    }).catch(err => {
        console.error(err);
    })
});

app.post('/api/executeCommand', async (req, res, next) => {
    const required = checkRequiredProperties(['query.servers', 'body.command'], req, next);
    if (!required.ok) {
        return false;
    }

    const date = new Date();
    const dateStr = date.toLocaleString();
    const configServers = req.app.locals.servers;
    const reqServers = req.query.servers.split(',');
    const command = req.body.command;
    const promises = [];
    const meta = {
        endpoint: 'executeCommand',
        params: {
            ...req.query,
            ...req.body
        },
        servers: reqServers,
    };
    promises.push(runCommand(`:> ./output/command.txt`));
    reqServers.forEach(async name => {
        const server = configServers.find(server => server.name === name);
        promises.push(runCommand(`ssh ${server.user}@${server.hostname} "${command}"`, {
            header: `<span id="header-${server.name}" class="log-header">Output from ${server.name}</span><div class="log-output">`,
            footer: `</div>`,
            outputFile: './output/command.txt',
        }));
    });

    Promise.all(promises).then(() => {
        fs.readFile('./output/command.txt', 'utf8', function(err, data) {
            if (err) throw err;
            success(res, {meta, data});
            appendHistory(meta);
        });
    }).catch(err => {
        console.error(err);
    })
});

app.get('/api/getDirectory', async (req, res, next) => {
    if (!req.query.directory) {
        const err = {
            message: 'No directory specified',
            status: 400
        };
        next(err);
        return false;
    }
    if (!req.query.server) {
        const err = {
            message: 'No server specified',
            status: 400
        };
        next(err);
        return false;
    }

    const configServers = req.app.locals.servers;
    const serverName = req.query.server;
    const server = configServers.find(server => server.name === serverName);
    const filter = req.query.filter ? ` | grep ${req.query.filter}` : '';
    const fileCount = await runCommand(`ssh ${server.user}@${server.hostname} "ls -lh ${req.query.directory} | sed 1d${filter} | wc -l"`);
    const meta = {
        endpoint: 'getDirectoryList',
        params: req.query,
        servers: [serverName]
    }
    await runCommand(`:> ./output/directory.txt`);
    await runCommand(`ssh ${server.user}@${server.hostname} "ls -lh ${req.query.directory} | sed 1d${filter}"`, {
        outputFile: './output/directory.txt'
    })
    .then((data) => {
        const lines = data.split('\n');
        const files = [];
        lines.forEach(line => {
            const permissions = line.substring(0, 10);
            const isDirectory = permissions.charAt(0) === 'd';
            const parts = line.split(/\s+/);
            if (parts.length > 2) {
                const file = {
                    permissions: permissions,
                    name: parts[parts.length - 1],
                    type: isDirectory ? 'directory' : 'file',
                    size: parts[4],
                    modified: parts[5] + ' ' + parts[6] + ' ' + parts[7]
                    };
                files.push(file);
            }
        });
        appendHistory(meta);
        success(res, {meta, files});
    })
    .catch(err => {
        console.error(err);
    });
});

app.get('/api/export', async (req, res) => {
    fs.readFile(`./output/${req.output_type}.txt`, 'utf8', (err, data) => {
        if (err) throw err;

        const dateStr = getDateString();
        let meta = data.match(/__META=\{\{(.*)\}\}/)[1];
        meta = JSON.parse(meta);
        let response = data;
        let metaString = '';
        Object.keys(meta).forEach(key => {
            metaString += `${key}: ${meta[key]}\n`;
        });
        response = metaString + response;
        response = response.replace(/__META=\{\{(.*)\}\}/, '');
        response = response.replace(/<span class="log-header">(.*)<\/span><div class="log-output">/g, '========== $1 ==========');
        response = response.replace(/<span class="match-separator"><\/span>/g, '--------------------');
        response = response.replace(/(<(span|div){1} class=".*">|<\/(span|div){1}>)/g, '');
        res.setHeader('Content-disposition', `attachment; filename=${req.output_type}_export-${dateStr}.txt`);
        res.setHeader('Content-type', 'text/plain');
        res.charset = 'UTF-8';
        res.write(response);
        res.end();
    });
});

app.get('/api/getHistory', async (req, res) => {
    History.findAll()
        .then(history => {
            success(res, {history});
        });
});


async function runCommand(command, options = { header: '', footer: '', outputFile: null}) {
    const execute = spawn(command, {shell: true});
    let output = '';

    const promise = new Promise((resolve, reject) => {
        execute.stdout.on('data', (data) => {
            output += data;
        });

        execute.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        execute.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
            if (options.outputFile && output.length) {
                if (options.header) {
                    output = options.header + '\n' + output;
                }

                if (options.separator) {
                    output = output.replace(/----------/g, options.separator);
                }

                if (options.footer) {
                    output = output + '\n' + options.footer;
                }

                fs.appendFile(options.outputFile, output, (err) => {
                    if (err) throw err;
                });

                fs.readFile(options.outputFile, 'utf8', (err, data) => {
                    if (err) throw err;
                    return resolve(data);
                });
            } else {
                return resolve(output);
            }
        });
    });

    return promise;
}

function appendHistory(data) {
    const timestamp = new Date().toISOString();
    sequelize.sync().then(() => {
        History.create(data);
    }).catch(err => {
        console.error(err);
    });
}

function getDateString() {
    const date = new Date();
    const dateStr = `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}@${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`;
    return dateStr;
}

function checkRequiredProperties(key, req, next) {
    let required = Array.isArray(key) ? key : [key];
    let messages = [];
    let err = null;
    required.forEach(property => {
        const obj = property.split('.')[0];
        const key = property.split('.')[1];
        if (!req[obj][key]) {
            messages.push(`No ${key} specified in ${obj}.`);
        }
    });
    if (messages.length) {
        err = {
            errors: messages,
            status: 400
        };
        next(err);
    }
    return {
        ok: messages.length === 0,
        err: err
    }
}

function success(res, data) {
    const response = {
        ok: true,
        response: data
    }
    res.send(response);
}

app.use((err, req, res, next) => {
    console.log(err);
    if (res.headersSent) {
        return next(err);
    }
    const error = {
        errors: err.errors,
        ok: false
    }
    res.status(err.status || 500);
    res.send(error);
});

app.listen(process.env.port || 3000);
console.log('Running at Port 3000');
