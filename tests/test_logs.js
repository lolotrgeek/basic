const { Node } = require("basic-messaging")
const node = new Node("logger")

node.listen("logs", console.log)
