const { resolve } = require("path");
const fs = require("fs");

// Find all task index.ts files
const taskDirs = fs.readdirSync("src/tasks");
const tasks = taskDirs
  .map(dir => `src/tasks/${dir}/index.ts`)
  .filter(file => fs.existsSync(file));

module.exports = tasks.map((task) => ({
  entry: `./${task}`,
  target: "node",
  externalsPresets: { node: true },
  // Don't mark any npm packages as external - bundle everything except Node.js built-ins
  externals: [],
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: [/node_modules/, /dist/],
      },
    ],
  },
  mode: "production",
  resolve: {
    extensions: [".ts", ".js"],
  },
  output: {
    filename: task.replace(/\.ts$/, ".js").replace(/src[/\\]/, ""),
    path: resolve(__dirname, "dist"),
    libraryTarget: "commonjs2",
  },
}));
