// This is main process of Electron, started as first thing when your
// app starts. It runs through entire life of your application.
// It doesn't have any windows which you can see on screen, but we can open
// window from here.
import path from "path";
import url from "url";
import { app, Menu, contextBridge, ipcRenderer, ipcMain, shell } from "electron";
import createWindow from "./server/window";
import TranscribeAudio from "./server/transcribeAudio";
import ChatAi from "./server/chatAi";
import env from "env";
let mainWindow;

const initIpc = () => {
  var ai = new ChatAi();
 
  ipcMain.on('getSaveAudio', async (event, payload) => {
    var audio = new TranscribeAudio();
    audio.saveFileAndTranscribe(event, payload);
  });

  ipcMain.on('getChat', async (event, payload) => {
    ai.sendChat(event, payload);
  });

  ipcMain.on('getHistory', async (event, _) => {
    ai.sendHistory(event, _);
  });
  ipcMain.on('getAiModelInfo', async (event, payload) => {
    ai.sendModelInfo(event, payload);
  });

  ipcMain.on('getAiResp', async (event, payload) => {
    ai.reply(event, payload);
  });

  ipcMain.on('getSaveChat', async (event, payload) => {
    ai.saveChat(event, payload);
  });

  ipcMain.on('getFriendlyName', async (event, payload) => {
    ai.getFriendlyName(event, payload);
  });

  ipcMain.on('getDeleteChat', async (event, payload) => {
    ai.deleteChat(event, payload);
  });

  ipcMain.on('getListOfModels', async (event, payload) => {
    ai.getListOfModels(event, payload);
  });

  // ipcMain.on('getAiReset', async (event, payload) => {
  //   ai.resetChat(event, payload);
  // });

  ipcMain.on('minimize-window', () => {
    if (mainWindow) {
      mainWindow.minimize();
    }
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.restore();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.on('close-window', () => {
    if (mainWindow) {
      mainWindow.close();
    }
  });
};

app.on("ready", () => {
  initIpc();
  mainWindow = createWindow("main", {
    width: 1000,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: env.name === "test"
    },
    frame: false,
  });

  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, "home.html"),
      protocol: "file:",
      slashes: true
    })
  );
});

app.on("window-all-closed", () => {
  app.quit();
});
