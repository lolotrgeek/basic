const { Node } = require("basic-messaging")
const node = new Node("checker")

let peers = []

// node.listen("*", console.log)
node.listen("*", message => typeof message === 'object' && message.state ? console.log(message) : console.log('update'))
