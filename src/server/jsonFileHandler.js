import fs from 'fs';
import path from 'path';

class JsonFileHandler {
  constructor() {
  }

  // Save a JSON array to a file
  async saveJsonArray(filePath, jsonArray) {
    console.log("saveJsonArray", path.resolve(filePath));
    return new Promise((resolve, reject) => {
      fs.writeFile(path.resolve(filePath), JSON.stringify(jsonArray, null, 2), 'utf8', (err) => {
        if (err) {
          return reject(err);
        }
        resolve('JSON array saved successfully.');
      });
    });
  }

  // Retrieve the JSON array from the file
  async retrieveJsonArray(filePath) {
    return new Promise((resolve, reject) => {
      fs.readFile(path.resolve(filePath), 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }
        try {
          const jsonArray = JSON.parse(data);
          resolve(jsonArray);
        } catch (parseError) {
          reject('Error parsing JSON data: ' + parseError);
        }
      });
    });
  }

  
  // Delete a specified JSON file
  async deleteJsonFile(filePath) {
    return new Promise((resolve, reject) => {
      fs.unlink(path.resolve(filePath), (err) => {
        if (err) {
          return reject(err);
        }
        resolve('JSON file deleted successfully.');
      });
    });
  }

  // List all JSON files in a specified directory with their names and stats
async listJsonFiles(directory) {
    return new Promise((resolve, reject) => {
      fs.readdir(directory, (err, files) => {
        if (err) {
          return reject(err);
        }
        
        // Filter and retrieve only .json files with their stats
        const jsonFilePromises = files
          .filter(file => file.endsWith('.json'))
          .map(file => {
            return new Promise((resolve) => {
              const filePath = path.join(directory, file);
              fs.stat(filePath, (err, stats) => {
                if (!err) {
                  resolve({
                    name: file,
                    stats: stats // Last modified time
                  });
                } else {
                  resolve(null);
                }
              });
            });
          });
        
        // Wait for all promises to resolve and filter out any null results
        Promise.all(jsonFilePromises).then(results => {
          var jsonFilesData = results.filter(fileInfo => fileInfo !== null);
          jsonFilesData = jsonFilesData.sort((a, b) => parseInt(b.stats.birthtimeMs) - parseInt(a.stats.birthtimeMs));
          resolve(jsonFilesData);
        });
      });
    });
  }
  
}

export default JsonFileHandler;
