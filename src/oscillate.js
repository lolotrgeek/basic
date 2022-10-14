const { randomUUID } = require('crypto')
const { Node } = require("basic-messaging")
const { Chain } = require("basic-chain")
const { decode, encode } = require("./helpers")

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
            this.debug = true
            this.location
            this.direction
            this.position
            this.spinner = spin => setInterval(spin, this.interval)
            this.isState = data => typeof data === "object" && data.state && !isNaN(data.state) && typeof data.chain_id === 'string'
            this.invert_state = state => state === 0 ? 1 : 0
            this.log = console.log
        } catch (error) {
            this.log(`constructor: ${error}`)
        }
    }

    buildState() {
        try { return encode({ chain_id: this.chain.id, state: this.state, location: this.location, direction: this.direction, name: this.name }) } catch (error) { this.log(`buildState ${error}`) }
    }

    sendState(to) {
        try { setTimeout(() => this.node.send(to, this.buildState()), 1000) } catch (error) { this.log(`sendState ${error}`) }
    }

    sayState(state, name) {
        try { this.log(`Heard: state ${state} from ${name}`) } catch (error) { this.log(`sayState ${error}`) }
    }

    isValidNeighbor(neighbor_block) {
        try { return neighbor_block && typeof neighbor_block.data === 'string' } catch (error) { this.log(`isValidNeighbor ${error}`) }
    }

    getNeighborName(neighbor) {
        try {
            return neighbor.data
        } catch (error) { this.log(`getNeighborName ${error}`) }
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
        } catch (error) { this.log(`selectNeighborAbove ${error}`) }
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
        } catch (error) { this.log(`selectNeighborBelow ${error}`) }
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
        } catch (error) { this.log(`selectNeighbor ${error}`) }
    }

    /**
     * The index of a block is a node's location
     * @returns 
     */
    getLocation(name) {
        try {
            this.log("Finding Location...", name)
            let location = this.chain.blocks.findIndex(block => block.data === name)
            if (location === -1) {
                this.log("Unable to find", name)
                return false
            }
            this.log("Found Location: ", location)
            return location
        } catch (error) { this.log(`getLocation: ${error}`) }
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
        } catch (error) { this.log(`getPosition: ${error}`) }
    }

    isNameValid(name) {
        return typeof name === 'string' && name[0] === 'o' && name[1] === "_"
    }

    setState(data) {
        try {
            this.log("Setting State")
            if (this.position === 'first') {
                // this.log(`${this.name} | I'm first.`)
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
                // this.log(`${this.name} | I'm last.`)
                this.state = data.state
                this.recpient = this.selectNeighborBelow(this.location)
                this.direction = 'down'
            }
        } catch (error) {
            this.log(`setState: ${error}`)
        }
    }

    stateCondition(data) {
        if(!this.location) return false
        if(!this.position) return false
        if(typeof data !== 'object') { this.log("stateCondition: Data is not object"); return false}
        if(data.chain_id !== this.chain.id) { this.log("stateCondition: Chain mis-match!"); return false}
        if(!data.state) { this.log("stateCondition: No state."); return false}
        if(!data.name) { this.log("stateCondition: No name."); return false}
        else return true
    }

    State(data) {
        try {
            this.location = this.getLocation(this.name)
            this.position = this.getPosition(this.location)
            this.log("Running State", this.location, this.position)
            if (this.stateCondition(data)) {
                this.sender_location = this.getLocation(data.name)
                this.log("isState from:", this.sender_location)
                this.setState(data)
                if (typeof this.recpient === 'string') this.sendState(this.recpient)
                this.log(`LOCATION ${this.location} | ${this.position} | ${this.name} | state ${this.state} [${this.direction}] --> ${this.recpient}`)
            }

        } catch (error) {
            this.log(`state: ${error}`)
        }
    }

    listener(message) {
        try {
            this.log(message)
            if (this.isPeer(message)) this.update(message.advertisement.name)
            let data = decode(message)
            this.log(data)
            if (data.chain && this.chain.isValid(data.chain)) {
                this.chain.merge(data.chain)
                this.log(this.chain ? `Merged ${this.chain}` : "broken chain...")
                this.State(decode(this.buildState()))
            }
            else if (this.isState(data)) this.State(data)
            else this.node.send(data.name, encode({chain: this.chain, name: this.name}))
        }
        catch (error) {
            this.log(`listener: ${error}`)
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
                console.log(name)
                this.node.send(name, encode({chain: this.chain, name: this.name}))
            }
        } catch (error) {
            this.log(`update: ${error}`)
        }
    }

    isPeer(message) {
        try {
            return typeof message === 'object' && typeof message.id === 'string' && message.address && message.advertisement.name
        } catch (error) {
            this.log(`isPeer: ${error}`)
        }
    }

    run() {
        try {
            this.log("alive " + this.name)
            this.node.listen("*", message => this.listener(message))

            this.State(decode(this.buildState()))
        } catch (error) {
            this.log(`run: ${error}`)
        }
    }

    test() {
        if (this.chain && this.chain.isValid(this.chain)) setInterval(() => {
            try { this.log(this.chain.blocks.length) }
            catch (error) { this.log(`test: ${error}`) }
        }, 5000)
    }
}

module.exports = { Oscillate }