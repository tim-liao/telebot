const TeleBot = require("telebot");
const bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN);
//https://www.ruyut.com/2020/03/js-https-get.html
var https = require("https");
var fs = require("fs");

var url =
  "https://data.epa.gov.tw/api/v1/aqx_p_432?limit=1000&api_key=9be7b239-557b-4c10-9775-78cadfc555e9&sort=ImportDate%20desc&format=json";

let Data;
let buttonArea; //判斷每個按鈕不同的使用情境的變數
let CountySiteNameObjectII; // 查字典用的
/* 這是telebot專屬鍵盤layout (telebotInlineButtonLayoutSetting) */
let inlineButtonHere;

/* 這是使用者收到測站資料 */ /*已改成區域變數 */
//let siteSortData;

/* 要設定定時提醒的測站名稱 (reminderSiteName) */
let setUpTimeSiteName = {};

/* 測資的中文對照名稱所需變數 */
let fieldsObject = {};

/* 屬於Cronjob用的變數 */
let job = {};
var CronJob = require("cron").CronJob;
let dataRunNumber = 0;
/* dataRun是去抓政府開放資料中的AQX Data(空氣品質資料)(之後可用generator、catcher、crawler來命名)，同時現在還有在每跑一次後作新的字典 */
const dataRun = function () {
  https.get(url, function (response) {
    var data = "";
    //console.log("start");
    response.on("data", (chunk) => {
      //console.log("on data");
      data += chunk;
    });

    response.on("end", () => {
      data = JSON.parse(data); //轉換成JS
      Data = data;

      //console.log(data.records[0].SiteName);
      console.log("已跑完");
      //***說做查字典，直接把查字典放在抓資料裡面，擔心會新增測站或是減少測站//
      /////現在說做資料庫
      ///////////////////////////////////////////////////////////////////////

      const DictionaryCountySiteName = function (Data) {
        CountySiteNameObjectII = {};
        for (let i = 0; i < Data.records.length; i++) {
          let key = Data.records[i].County;
          let values = Data.records[i].SiteName;
          if (CountySiteNameObjectII.hasOwnProperty(key)) {
            //檢查object裡面有無此county作key存在
            CountySiteNameObjectII[key].push(values);
          } else {
            CountySiteNameObjectII[key] = [values];
          }
        }
      };
      DictionaryCountySiteName(Data);
      //console.log(Object.keys(CountySiteNameObjectII));
      //////////////////////////////////////////////////////////////////

      ///以下是把各測站的資訊與中文對上的code

      const addFieldsObject = function (keys, values) {
        return (fieldsObject[keys] = values);
      };
      for (let i = 0; i < Data.fields.length; i++) {
        let fieldsKeys = Data.fields[i].id;
        let fieldsValues = Data.fields[i].info.label;
        addFieldsObject(fieldsKeys, fieldsValues);
      }
      //console.log(fieldsObject);
      //////////////////////
      ///以上是把各測站的資訊與中文對上的code

      //////因為不知道怎麼用執行順序來讓dataRun跑完再來跑資料庫，所以先在這裡繞過
      if (dataRunNumber == 0) {
        qwqwqwq();
      }
      dataRunNumber = 1;
    });
  });
};

/* 製作InlineButton用的 */
const makeAInlineButtonHere = function (x) {
  const searchQuery = [];
  let searchSetArray = x;
  for (let i = 0; i < searchSetArray.length; i++) {
    let separateArray = [];
    separateArray.push(searchSetArray[i]);
    searchQuery.push(separateArray);
  }
  inlineButtonHere = [];
  for (let i = 0; i < searchQuery.length / 5; i++) {
    if (inlineButtonHere[i] == undefined) {
      inlineButtonHere[i] = [
        bot.inlineButton(`${searchQuery[i * 5]}`, {
          callback: `${searchQuery[i * 5]}`,
        }),
      ];
    }
    for (let y = 0; y < 5; y++) {
      if (inlineButtonHere[i].length < 5 && searchQuery[i * 5 + 1 + y]) {
        inlineButtonHere[i].push(
          bot.inlineButton(`${searchQuery[i * 5 + 1 + y]}`, {
            callback: `${searchQuery[i * 5 + 1 + y]}`,
          })
        );
      }
    }
  }
};

/* 使用者最終需要收到的測站資料 */
const siteSortDataHere = function (sitename) {
  /* 收到使用者丟回的測站名稱後，設定此變數蒐集Data裡面擁有該測站名稱的資料  (siteRawData) */
  let siteRawData;
  //console.log(Data);
  for (let i = 0; i < Data.records.length; i++) {
    if (sitename == Data.records[i].SiteName) {
      console.log(Data.records[i].SiteName);
      siteRawData = Data.records[i];
      break;
    }
  }

  let fieldsObjectAllkeys = Object.keys(fieldsObject);
  let siteSortData = "";
  for (let i = 0; i < fieldsObjectAllkeys.length; i++) {
    let fieldsValues = fieldsObject[`${fieldsObjectAllkeys[i]}`];
    //console.log(`siteRawData ${siteRawData}`);
    let siteRawDataValues = siteRawData[`${fieldsObjectAllkeys[i]}`];
    siteSortData += `${fieldsValues} 為 ${siteRawDataValues || "無"}\n`;
  }
  return siteSortData;
};

/* 說因為資料是每小時更新一次，所以不用那麼平凡每跑一次就抓取資料一次(包含縣市那些) */

let renewData;
//var CronJob = require("cron").CronJob;
renewData = new CronJob(
  "0 30 * * * *",
  () => {
    dataRun();
    let num = Date.now();
    let dd = new Date(num);
    console.log(JSON.stringify(CountySiteNameObjectII));
    console.log(dd.toString() + "<br />");
  },
  null,
  false,
  "Asia/Taipei"
);
renewData.start();

/////////////////////////////////////////做資料庫存資料防止死機時使用者設定資料消失
//https://ithelp.ithome.com.tw/articles/10238605
var mysql = require("mysql");

var pool = mysql.createPool({
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: process.env.MYSQL_WAITFORCONNECTIONS,
  connectionLimit: process.env.MYSQL_CONNECTIONLIMIT, //連線數上限
});
const qwqwqwq = async function () {
  // 取得連線

  pool.getConnection((connectionErr, connection) => {
    if (connectionErr) {
      console.log(connectionErr);
    } else {
      connection.query(
        "SELECT * FROM users  ",

        async function (queryErr, queryRows) {
          await Data;
          //callback function
          console.log(queryRows);
          /// queryRows是拿到的資料庫資料，在機器人重啟時可以把資料庫的資料重新設定定時功能
          for (let i = 0; i < queryRows.length; i++) {
            let queryRowsSiteName = queryRows[i].site_name;
            let cronTimeHere = "0 0 " + queryRows[i].set_time + " * * *";
            let cronJobInside;
            cronJobInside = new CronJob(cronTimeHere, () => {
              bot.sendMessage(
                queryRows[i].id,
                siteSortDataHere(queryRowsSiteName)
              );
            });
            job[queryRows[i].id] = cronJobInside;
            job[queryRows[i].id].start();
            console.log(`i已跑到${i}`);
          }
          ///

          //console.log(queryErr);
          // 釋放連線
          connection.release();
        }
      );
    }
  });
};

///////////////////

dataRun();

/* countySearch是用來蒐集所有測站的縣市，之後給inlineButtonHere這個變數，讓inlineButtonHere成為按鈕在鍵盤跑出來 */

/* siteNameSearch是用來蒐集使用者給與特定縣市後，該縣市所擁有的測站名稱，之後給inlineButtonHere這個變數，讓inlineButtonHere成為按鈕在鍵盤跑出來 (setSiteNameListByCounty) */

/* 下方都是機器人的監聽事件 */
bot.on(["/start"], (msg) => {
  let replyMarkup = bot.keyboard(
    [
      ["/start", "/hide", "/stop"],
      ["/setUpTimedNotifications", "/instantInformation"],
    ],
    { resize: true }
  );

  return bot.sendMessage(msg.from.id, "空氣品質查詢選單", {
    replyMarkup,
  });
});

bot.on("/hide", (msg) => {
  return bot.sendMessage(msg.from.id, "已隱藏快捷鍵，請按 /start 再次顯示.", {
    replyMarkup: "hide",
  });
});

bot.on("/instantInformation", (msg) => {
  //console.log(msg.from.id);
  buttonArea = "instantInformation";
  makeAInlineButtonHere(Object.keys(CountySiteNameObjectII));
  //console.log(inlineButtonHere);
  let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

  return bot.sendMessage(msg.from.id, "選擇你要查詢的區域", {
    replyMarkup,
  });
});
bot.on("/stop", (msg) => {
  if (job[`${msg.from.id}`]) {
    job[`${msg.from.id}`].stop();
    delete job[`${msg.from.id}`];
    delete setUpTimeSiteName[`${msg.from.id}`];
    ////////////////刪除資料
    pool.getConnection((err, connection) => {
      if (err) {
        console.log(err);
      } else {
        connection.query(
          "DELETE FROM users where id = ?",
          [msg.from.id],
          function (err, rows) {
            //callback function
            console.log(rows);
            console.log(err);
            // 釋放連線
            connection.release();
          }
        );
      }
    });
    /////////
    bot.sendMessage(msg.from.id, "已停止並刪除每日定時推送資訊");
    //console.log(job);
  } else {
    bot.sendMessage(msg.from.id, "未設置每日定時推送");
  }
});

bot.on("/setUpTimedNotifications", (msg) => {
  buttonArea = "setUpTimedNotifications";
  makeAInlineButtonHere(Object.keys(CountySiteNameObjectII));
  //console.log(inlineButtonHere);
  let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

  return bot.sendMessage(msg.from.id, "請選擇你要設定定時提醒的區域", {
    replyMarkup,
  });
});

// Inline button callback
bot.on("callbackQuery", (msg) => {
  //這是第二個此部分的第二個callback，因為我設定一個變數去判別是否需要回應此項callback，同時在跑callback的時候會從上到下都去跑跑看，所以後面的步驟放前面才不會重複執行
  if (buttonArea == "instantInformation") {
    makeAInlineButtonHere(CountySiteNameObjectII[msg.data]);
    // console.log(inlineButtonHere);
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "instantInformationCounty";
    //console.log(buttonArea + "123123123");
    return bot.sendMessage(msg.from.id, `請在 ${msg.data} 選擇你要查詢的地區`, {
      replyMarkup,
    });
  } else if (buttonArea == "instantInformationCounty") {
    let siteName = msg.data;
    let replyMarkup = bot.sendMessage(msg.from.id, siteSortDataHere(siteName));
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    return bot.sendMessage(
      msg.from.id,
      `這是你要的 ${msg.data} 即時空氣品質資訊`,
      { replyMarkup }
    );
  } else if (buttonArea == "setUpTimedNotifications") {
    makeAInlineButtonHere(CountySiteNameObjectII[msg.data]);
    // console.log(inlineButtonHere);
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "setUpTimedNotificationsCounty";

    return bot.sendMessage(
      msg.from.id,
      `請在 ${msg.data} 選擇你要要設定定時提醒的地區`,
      {
        replyMarkup,
      }
    );
  } else if (buttonArea == "setUpTimedNotificationsCounty") {
    setUpTimeSiteName[`${msg.from.id}`] = msg.data;
    console.log(setUpTimeSiteName[`${msg.from.id}`]);
    const numbers = [];

    for (let i = 0; i < 24; i++) {
      numbers[i] = `${i + 1}`;
    }
    makeAInlineButtonHere(numbers);
    let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    buttonArea = "setUpTimedNotificationsTime";
    return bot.sendMessage(
      msg.from.id,
      `請在 ${msg.data} 選擇你要每日提醒的時間 (選項單位為時)`,
      {
        replyMarkup,
      }
    );
  } else if (buttonArea == "setUpTimedNotificationsTime") {
    //////////////////////////////////////新增資料到資料庫
    pool.getConnection((err, connection) => {
      if (err) {
        console.log(err);
      } else {
        connection.query(
          "INSERT INTO users(`id`, `set_time`, `site_name`) values (?,?,?) ",
          [msg.from.id, msg.data, setUpTimeSiteName[`${msg.from.id}`]],
          function (err, rows) {
            //callback function
            console.log(rows);
            console.log(err);
            // 釋放連線
            connection.release();
          }
        );
      }
    });
    ////////////
    let cronTimeHere = "0 0 " + msg.data + " * * *";
    //console.log(cronTimeHere);
    //為了要設定讓推播可以同時給很多人，嘗試讓job變成一個object，裡面是id:cronjob這樣
    let cronJobInside;
    cronJobInside = new CronJob(
      cronTimeHere,
      () => {
        bot.sendMessage(
          msg.from.id,
          siteSortDataHere(setUpTimeSiteName[`${msg.from.id}`])
        );
      },
      null,
      false,
      "Asia/Taipei"
    );
    job[`${msg.from.id}`] = cronJobInside;
    job[`${msg.from.id}`].start();
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );

    return bot.sendMessage(
      msg.from.id,
      `已設定 ${setUpTimeSiteName[`${msg.from.id}`]} 於每日 ${msg.data} 點提醒`
    );
  } else {
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );
    return bot.sendMessage(
      msg.from.id,
      `步驟選擇錯誤，請回到主選單重新選擇要查詢的事項`
    );
  }
});

bot.start();
