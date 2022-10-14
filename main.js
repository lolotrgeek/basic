const {Spawner} = require('process-spawn')
const spawner = new Spawner()
spawner.spawn_node("./src/runner.js", 5)
