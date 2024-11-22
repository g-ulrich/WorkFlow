
import Transcribe from './openai/transcribe';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
ffmpeg.setFfmpegPath('C:\\Programs\\x64\\ffmpeg-7.1\\bin\\ffmpeg.exe');


export default class TranscribeAudio{
    constructor(){
        this.ai_transcribe = new Transcribe();
        this.filepath = 'src/server/output.wav';
    }

    async transcibeFileAndSend(ipcEvent){
        try {
            const text = await this.ai_transcribe.run(this.filepath);
            ipcEvent.reply('sendSaveAudio', { success: true, progress: 'finished', resp: text});
        } catch (error) {
            console.error('Error transcibeFileAndSend:', error);
            ipcEvent.reply('sendSaveAudio', { success: false, progress: 'error', error: error.message, resp: ''});
        }
    }

    saveFileAndTranscribe(ipcEvent, payload){
        try {
            const buffer =Buffer.from(payload.audio);
            const sampleRate = 44100;
            const channels = 1;
            const wavFile = fs.createWriteStream(this.filepath);
            const tempInputFile = 'temp_input.raw';
            fs.writeFileSync(tempInputFile, buffer);
      
            const ffmpegProcess = ffmpeg(tempInputFile)
                .audioChannels(channels)
                .audioFrequency(sampleRate)
                .format('wav')
                .on('start', () => {
                    // ipcEvent.reply('sendSaveAudio', { success: true, progress: 'started', resp: ''});
                })
                .on('end', () => {
                    // ipcEvent.reply('sendSaveAudio', { success: true, progress: 'working', resp: ''});
                    wavFile.end();
                    fs.unlinkSync(tempInputFile);
                })
                .on('error', (error) => {
                    ipcEvent.reply('sendSaveAudio', { success: false, error: error.message, progress: 'error', resp: '' });
                    fs.unlinkSync(tempInputFile);
                });
      
            ffmpegProcess.pipe(wavFile);
      
            wavFile.on('finish', () => {
                this.transcibeFileAndSend(ipcEvent);
            });
        } catch (error) {
          console.error('Error saveFileAndTranscribe:', error);
          ipcEvent.reply('sendSaveAudio', { success: false, error: error.message, progress: 'error', resp: '' });
        }
    }
}