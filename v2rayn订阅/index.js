const puppeteer = require('puppeteer');
const sqlite3 = require('sqlite3').verbose();
const ps = require('ps-node');
const fs = require("fs");
const path = require("path");

function getRunningV2raynPath() {
    return new Promise((resolve, reject) => {
        ps.lookup({
            command: 'v2rayn.exe',
        }, (err, resultList) => {
            if (err) {
                console.log('查询过程中出现错误：', err);
                reject(err);
                return;
            }

            if (resultList.length > 0) {
                const v2raynProcess = resultList[0];
                const parsedPath = path.parse(v2raynProcess.command);

                resolve(parsedPath.dir);
            } else {
                console.log('v2rayn 未在运行');
                resolve(null);
            }
        });
    });
}


class SubGet {
    async initialize(url,sel, remarks, id) {
        this.url = url;
        this.sel = sel[0];
        this.el = sel[1];
        this.remarks = remarks;
        this.id = id;

        this.browser = await puppeteer.launch({
            headless: "new",
            slowMo: 250,
            // defaultViewport: { width: 200, height: 200 },
            // args: ['--window-size=0,0'],
            executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        });
        await this.start();
    }

    async start() {
        const page = await this.browser.newPage();
        console.log('正在：' + this.url);

        await page.goto(this.url);
        let content;
        if (this.listEl) {
            await page.waitForSelector(this.listEl);
            content = await page.$eval(this.listEl, element => element.href);
            await page.goto(content);

            console.log('正在：' + content);
        }
        await page.waitForSelector(this.el);
        content = await page.$eval(this.el, element => element.textContent);
        // 定义匹配URL的正则表达式模式
        const urlPattern = /https?:\/\/[^\s/$.?#].[^\s]*/gi;

        // 查找匹配的链接
        const matches = content.match(urlPattern);

        // 输出匹配的链接
        for (const match of matches || []) {
            let convertTarget = "";

            if (match.endsWith("yaml")) {
                convertTarget = "mixed";
            }
            console.log(`链接${this.remarks}：${match}`);
            // 调用 UpSubItem.Up() 函数
            await new UpSubItem(match, this.remarks, this.id, convertTarget); // 等待函数完成

            await this.browser.close();
        }
    }
}

class UpSubItem {
    constructor(url, remarks, id, convertTarget) {
        getRunningV2raynPath()
            .then(command => {
                if (command) {

                    const outputValue = path.join(command, 'guiConfigs/guiNDB.db'); // 替换为实际的输出路径
                    // console.log(outputValue)
                    // 打开数据库连接
                    const db = new sqlite3.Database(outputValue, sqlite3.OPEN_READWRITE)

                    // 定义 SQL 语句以插入或替换 SubItem 表中的记录
                    const insertOrUpdateSql = `INSERT OR REPLACE INTO SubItem (remarks, url, id, convertTarget) VALUES (?, ?, ?, ?)`;

                    // 执行 SQL 语句
                    db.run(insertOrUpdateSql, [remarks, url, id, convertTarget], function (err) {
                        if (err) {
                            console.error(err.message);
                        }

                        // 关闭数据库连接
                        db.close((err) => {
                            if (err) {
                                console.error(err.message);
                            } else {
                                // console.log('Closed the database connection.');
                            }
                        });
                    });
                } else {
                    console.log('v2rayn 未在运行');
                }
                return command;
            })
            .catch(err => {
                console.log('获取路径时出现错误：', err);
            });


    }
}

async function main() {

    const filePath =await path.join(__dirname, "init.json");
    let fileContent = await fs.readFileSync(filePath, "utf8");
    let select= await JSON.parse(fileContent ).select

    await Promise.all(select.map(async (v, i) => {
        try {
            await new SubGet().initialize(v.url, v.sel, "a" + (i + 1), i + 1);
        } catch (e) {
            console.log('失败：' + v.url);
        }
    }));

    // All asynchronous tasks have completed, so you can now exit the process.
    process.exit(0);
}

main();
