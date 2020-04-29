const fs = require('fs-extra');
const router = require('koa-router')();
const { md5, waitUntill } = require('@yuri2/utils-general');
const { spawn } = require('child_process');
const { Readable } = require('stream');
const filePathAK = require('path').resolve(__dirname, '../access_key');
const dirPathScripts = require('path').resolve(__dirname, '../shell_scripts');

fs.ensureDirSync(dirPathScripts); // 保证脚本目录的存在

const regexScriptName = /^[\w.\u4e00-\u9fa5]{0,63}\.sh$/;
const regexScriptNameErrorText = `Invalid script name. Name must match ${regexScriptName.toString()}`;

function checkAK(ak) {
  // 首先检查本地ak文件是否存在
  if (fs.existsSync(filePathAK)) {
    const trueAK = fs.readFileSync(filePathAK, 'utf-8');
    return trueAK === ak;
  } else {
    return false;
  }
}

function getScriptFilePath(name) {
  return `${dirPathScripts}/${name}`;
}

function getSignature(name) {
  if (fs.existsSync(filePathAK)) {
    const trueAK = fs.readFileSync(filePathAK, 'utf-8');
    return md5(name + trueAK);
  } else {
    return false;
  }
}

// 验证accesskey
router.post('/ak/verify', async ctx => {
  const { ak } = ctx.request.body;
  ctx.body = { match: checkAK(ak) };
});

// 重置accesskey
router.post('/ak/reset', async ctx => {
  const { ak } = ctx.request.body;
  // 重置函数
  const resetAK = () => {
    const newAK = md5(Math.random() + '');
    fs.writeFileSync(filePathAK, newAK);
    return newAK;
  };
  // 首先检查本地ak文件是否存在
  if (fs.existsSync(filePathAK)) {
    const trueAK = fs.readFileSync(filePathAK, 'utf-8');
    // 存在则需要验证
    if (ak === trueAK) {
      ctx.body = { newAK: resetAK() };
    } else {
      ctx.body = { error: 'AK not match.' };
    }
  } else {
    ctx.body = { newAK: resetAK() };
  }
});

// 写脚本
router.post('/script/write', async ctx => {
  const { ak, name, content } = ctx.request.body;
  if (!checkAK(ak)) {
    ctx.body = { error: 'AK not match.' };
    return;
  }
  if (typeof name !== 'string' || !regexScriptName.test(name)) {
    ctx.body = {
      error: regexScriptNameErrorText,
    };
    return;
  }
  if (typeof content !== 'string') {
    ctx.body = {
      error: 'Invalid content.',
    };
    return;
  }
  fs.writeFileSync(getScriptFilePath(name), content);
  ctx.body = {
    ok: 1,
  };
});

// 读取脚本内容
router.post('/script/read', async ctx => {
  const { ak, name } = ctx.request.body;
  if (!checkAK(ak)) {
    ctx.body = { error: 'AK not match.' };
    return;
  }
  if (typeof name !== 'string' || !regexScriptName.test(name)) {
    ctx.body = {
      error: regexScriptNameErrorText,
    };
    return;
  }
  const filePath = getScriptFilePath(name);
  if (fs.existsSync(filePath)) {
    ctx.body = {
      content: fs.readFileSync(filePath, 'utf-8'),
      sign: getSignature(name),
    };
  } else {
    ctx.body = {
      error: 'File not exists.',
    };
  }
});

// 删除脚本
router.post('/script/remove', async ctx => {
  const { ak, name } = ctx.request.body;
  if (!checkAK(ak)) {
    ctx.body = { error: 'AK not match.' };
    return;
  }
  if (typeof name !== 'string' || !regexScriptName.test(name)) {
    ctx.body = {
      error: regexScriptNameErrorText,
    };
    return;
  }
  fs.removeSync(getScriptFilePath(name));
  ctx.body = {
    ok: 1,
  };
});

// 列出脚本
router.post('/script/list', async ctx => {
  const { ak } = ctx.request.body;
  if (!checkAK(ak)) {
    ctx.body = { error: 'AK not match.' };
    return;
  }
  const dir = fs.readdirSync(dirPathScripts);
  ctx.body = {
    dir,
  };
});

const runningScriptNames = new Set();

// 执行脚本
router.get('/script/run/:name/:sign', async ctx => {
  const { name, sign } = ctx.params;
  if (typeof name !== 'string' || !regexScriptName.test(name)) {
    ctx.body = {
      error: regexScriptNameErrorText,
    };
    return;
  }
  if (typeof sign !== 'string' || sign !== getSignature(name)) {
    ctx.body = {
      error: 'Invalid signature.',
    };
    return;
  }
  const filePath = getScriptFilePath(name);
  if (fs.existsSync(filePath)) {
    await waitUntill(() => !runningScriptNames.has(name), 200, 3600 * 1000);
    runningScriptNames.add(name);
    const readable = new Readable();
    readable._read = () => {};
    const handle = spawn('sh', [filePath]);
    handle.stderr.on('data', data => {
      readable.push(data);
    });
    handle.stdout.on('data', data => {
      readable.push(data);
    });
    handle.on('error', () => {
      runningScriptNames.delete(name);
      readable.push(null);
    });
    handle.on('close', () => {
      runningScriptNames.delete(name);
      readable.push(null);
    });
    ctx.body = readable;
  } else {
    ctx.body = {
      error: 'File not exists.',
    };
  }
});

module.exports = router;
