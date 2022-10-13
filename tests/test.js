const {Spawner} = require('process-spawn')
const spawner = new Spawner()
spawner.spawn_node("../../src/oscillate.js", 5)