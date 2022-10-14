const { Node } = require("basic-messaging")
const node = new Node("checker")

let peers = []

// node.listen("*", console.log)
// node.listen("logs", message => typeof message === 'object' && message.state ? console.log(message) : console.log('update'))
node.listen("*", console.log)
