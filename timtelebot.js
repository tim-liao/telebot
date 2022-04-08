const TeleBot = require("telebot");
const bot = new TeleBot("TELEGRAM_BOT_TOKEN");
//https://www.ruyut.com/2020/03/js-https-get.html
var https = require("https");
var fs = require("fs");

var url =
  "https://data.epa.gov.tw/api/v1/aqx_p_432?limit=1000&api_key=9be7b239-557b-4c10-9775-78cadfc555e9&sort=ImportDate%20desc&format=json";

let Data = new Array();
let buttonArea; //判斷每個按鈕不同的使用情境的變數
let CountySiteNameObjectII; // 查字典用的
/* 這是telebot專屬鍵盤layout (telebotInlineButtonLayoutSetting) */
let inlineButtonHere;

/* 這是使用者收到測站資料 */
let siteSortData = "";

/* 要設定定時提醒的測站名稱 (reminderSiteName) */
let setUpTimeSiteName;

/* 測資的中文對照名稱所需變數 */
let fieldsObject = {};

/* 屬於Cronjob用的變數 */
let job;
var CronJob = require("cron").CronJob;

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
      //jim說做查字典，直接把查字典放在抓資料裡面，擔心會新增測站或是減少測站//
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
      ///以下是把各測站的資訊與中文對上的code
    });
  });
};
dataRun();

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
  for (let i = 0; i < Data.records.length; i++) {
    if (sitename == Data.records[i].SiteName) {
      siteRawData = Data.records[i];
      break;
    }
  }

  let fieldsObjectAllkeys = Object.keys(fieldsObject);

  for (let i = 0; i < fieldsObjectAllkeys.length; i++) {
    let fieldsValues = fieldsObject[`${fieldsObjectAllkeys[i]}`];
    let siteRawDataValues = siteRawData[`${fieldsObjectAllkeys[i]}`];
    siteSortData += `${fieldsValues} 為 ${siteRawDataValues || "無"}\n`;
  }
};

/* 說因為資料是每小時更新一次，所以不用那麼平凡每跑一次就抓取資料一次(包含縣市那些) */

let renewData;
//var CronJob = require("cron").CronJob;
renewData = new CronJob("* 12 * * * *", () => {
  dataRun();
  let num = Date.now();
  let dd = new Date(num);
  console.log(JSON.stringify(CountySiteNameObjectII));
  console.log(dd.toString() + "<br />");
});
renewData.start();

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
  buttonArea = "instantInformation";
  makeAInlineButtonHere(Object.keys(CountySiteNameObjectII));
  //console.log(inlineButtonHere);
  let replyMarkup = bot.inlineKeyboard(inlineButtonHere);

  return bot.sendMessage(msg.from.id, "選擇你要查詢的區域", {
    replyMarkup,
  });
});
bot.on("/stop", (message) => {
  if (job) {
    job.stop();
    bot.sendMessage(message.chat.id, "已停止每日定時推送資訊");
    //console.log(job);
  } else {
    bot.sendMessage(message.chat.id, "未設置每日定時推送");
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
    siteSortDataHere(siteName);
    let replyMarkup = bot.sendMessage(msg.from.id, siteSortData);
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
    setUpTimeSiteName = msg.data;
    console.log(setUpTimeSiteName);
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
    siteSortDataHere(setUpTimeSiteName);
    let cronTimeHere = "* * " + msg.data + " * * *";
    console.log(cronTimeHere);
    job = new CronJob(cronTimeHere, () => {
      bot.sendMessage(msg.from.id, siteSortData);
    });
    job.start();
    bot.answerCallbackQuery(
      msg.id,
      `Inline button callback: ${msg.data}`,
      true
    );

    return bot.sendMessage(
      msg.from.id,
      `已設定 ${setUpTimeSiteName} 於每日 ${msg.data} 點提醒`
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
