// compile.js
const fs = require('fs');
const path = require('path');

const rawDir = path.join(__dirname, 'raw');
const outputFile = path.join(__dirname, 'trajectories.js');

const allMouseData = [];

fs.readdir(rawDir, (err, files) => {
  if (err) {
    console.error('Could not list the directory.', err);
    process.exit(1);
  }

  const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');

  Promise.all(jsonFiles.map(file => {
    return new Promise((resolve, reject) => {
      fs.readFile(path.join(rawDir, file), 'utf8', (err, data) => {
        if (err) {
          console.error('Could not read the file.', err);
          reject(err);
          return;
        }

        try {
          const jsonData = JSON.parse(data);
          // Extract the first 20 'mouse_data' arrays from each file
          const mouseData = jsonData
            .filter(item => item.task === 'movingdots')
            .slice(0, 20)
            .map(item => item.mouse_data);

          allMouseData.push(...mouseData);
          resolve();
        } catch (parseError) {
          console.error('Could not parse the JSON file.', parseError);
          reject(parseError);
        }
      });
    });
  }))
  .then(() => {
    // After processing all files, write the combined data to the output file
    const outputString = `const allTrajectories = ${JSON.stringify(allMouseData, null, 2)};`;

    fs.writeFile(outputFile, outputString, err => {
      if (err) {
        console.error('Could not write to the output file.', err);
        process.exit(1);
      }
      console.log(`Successfully combined data from ${jsonFiles.length} files into ${outputFile}`);
    });
  })
  .catch(err => {
    console.error('An error occurred:', err);
    process.exit(1);
  });
});