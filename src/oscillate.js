const { randomUUID } = require('crypto')
const { Child } = require("./child")
const { Node } = require("basic-messaging")
const { Chain } = require("basic-chain")
const { decode, encode, log } = require("./helpers")

class Oscillate {
    constructor() {
        try {
            this.name = `o_${Date.now()}_${randomUUID().substring(0, 8)}`
            this.node = new Node(this.name)
            this.chain = new Chain()
            this.chain.debug = false
            this.chain.put(this.name)
            this.state = -1
            this.interval = 5000
            this.debug = false
            this.location
            this.direction
            this.position
            this.spinner = spin => setInterval(spin, this.interval)
            this.isState = data => typeof data === "object" && data.state && !isNaN(data.state) && typeof data.chain_id === 'string'
            this.invert_state = state => state === 0 ? 1 : 0
        } catch (error) {
            log(`constructor: ${error}`)
        }
    }

    buildState() {
        try { return encode({ chain_id: this.chain.id, state: this.state, location: this.location, direction: this.direction, name: this.name }) } catch (error) { log(`buildState ${error}`) }
    }

    sendState(to) {
        try { setTimeout(() => this.node.send(to, {state: this.buildState(), from: this.name}), 1000) } catch (error) { log(`sendState ${error}`) }
    }

    sayState(state, name) {
        try { log(`Heard: state ${state} from ${name}`) } catch (error) { log(`sayState ${error}`) }
    }

    isValidNeighbor(neighbor_block) {
        try { return neighbor_block && typeof neighbor_block.data === 'string' } catch (error) { log(`isValidNeighbor ${error}`) }
    }

    getNeighborName(neighbor) {
        try {
            return neighbor.data
        } catch (error) { log(`getNeighborName ${error}`) }
    }

    /**
     * Selects a the above neighbor node
     * @param {*} self_location 
     * @returns 
     */
    selectNeighborAbove(self_location) {
        try {
            let neighbor_up = this.chain.blocks[self_location + 1]
            if (this.isValidNeighbor(neighbor_up)) return this.getNeighborName(neighbor_up)
            else return null
        } catch (error) { log(`selectNeighborAbove ${error}`) }
    }

    /**
     * Selects a the below neighbor node
     * @param {*} self_location 
     * @returns 
     */
    selectNeighborBelow(self_location) {
        try {
            let neighbor_down = this.chain.blocks[self_location - 1]
            if (this.isValidNeighbor(neighbor_down)) return this.getNeighborName(neighbor_down)
            else return null
        } catch (error) { log(`selectNeighborBelow ${error}`) }
    }

    /**
     * Selects a the neighbor node, first looking above then below
     * @param {*} self_location 
     * @returns 
     */
    selectNeighbor(self_location) {
        try {
            let neighbor_above = this.selectNeighborAbove(self_location)
            this.direction = 'up'
            if (neighbor_above) return neighbor_above
            let neighbor_below = this.selectNeighborBelow(self_location)
            this.direction = 'down'
            if (neighbor_below) return neighbor_below
            return null
        } catch (error) { log(`selectNeighbor ${error}`) }
    }

    /**
     * The index of a block is a node's location
     * @returns 
     */
    getLocation(name) {
        try {
            let location = this.chain.blocks.findIndex(block => block.data === name)
            return location > -1 ? location : null
        } catch (error) { log(`getLocation: ${error}`) }
    }

    /**
     * The position 
     * @returns
     */
    getPosition(location) {
        try {
            if (typeof location === 'number' && location === 0) return 'first'
            if (typeof location === 'number' && location === this.chain.blocks.length - 1) return 'last'
            return 'middle'
        } catch (error) { log(`getPosition: ${error}`) }
    }

    isNameValid(name) {
        return typeof name === 'string' && name[0] === 'o' && name[1] === "_"
    }

    setState(data) {
        try {
            if (this.position === 'first') {
                // log(`${this.name} | I'm first.`)
                this.state = this.invert_state(this.state)
                this.recpient = this.selectNeighborAbove(this.location)
                this.direction = 'up'
            }

            if (this.position === 'middle') {
                this.state = data.state
                if (this.sender_location > this.location) {
                    this.recpient = this.selectNeighborBelow(this.location)
                    this.direction = 'down'
                }
                else {
                    this.recpient = this.selectNeighborAbove(this.location)
                    this.direction = 'up'
                }
                
            }

            if (this.position === 'last') {
                // log(`${this.name} | I'm last.`)
                this.state = data.state
                this.recpient = this.selectNeighborBelow(this.location)
                this.direction = 'down'
            }
        } catch (error) {
            log(`setState: ${error}`)
        }
    }

    stateCondition(data, name) {
        return this.location && this.position && data && name && data.chain_id === this.chain.id && data.state && data.name
    }

    State(data) {
        try {
            this.location = this.getLocation(this.name)
            this.position = this.getPosition(this.location)
            if (this.stateCondition(data)) {
                this.sender_location = this.getLocation(data.name)
                this.setState(data)
                if (typeof this.recpient === 'string') this.sendState(this.recpient)
                log(`LOCATION ${this.location} | ${this.position} | ${this.name} | state ${this.state} [${this.direction}] --> ${this.recpient}`)
            }
            
        } catch (error) {
            log(`state: ${error}`)
        }
    }

    listener(message) {
        try {
            let data = decode(message)
            if (this.chain.isValid(data)) {
                this.chain.merge(data)
                if (this.debug === 'chain') log(this.chain ? `Merged ${this.chain}` : "broken chain...")
            }
            else if (this.isState(data)) this.State(data)
            else this.node.send(data.name, encode(this.chain))
        }
        catch (error) {
            log(`listener: ${error}`)
        }
    }

    /**
     * Adds a block to the local chain with the block data being the given node's name
     * @param {string} name is from node.core, and defined as `this.name` but to invoke peers this method allows for passing a `name`
     */
     update(name) {
        try {
            if (this.isNameValid(name)) {
                this.chain.put(name)
                this.node.send(name, encode(this.chain))
            }
        } catch (error) {
            log(`update: ${error}`)
        }
    }

    run() {
        try {
            this.node.send("connect", this.name)
            this.node.listen(this.name, this.listener)
            this.node.listen("connect", this.update)
            this.State(decode(this.buildState()))
        } catch (error) {
            log(`run: ${error}`)
        }
    }

    test() {
        if (this.chain && this.chain.isValid(this.chain)) setInterval(() => {
            try { log(this.chain.blocks.length) }
            catch (error) { log(`test: ${error}`) }
        }, 5000)
    }    
}

let service = () => {
    const oscillate = new Oscillate()
    oscillate.run()
}
Child(service)