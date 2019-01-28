const { assign } = Object 
    , classed = require('@compone/class')
    , event = require('@compone/event')
    , style = require('@compone/style')
    , client = require('utilise/client')
    , log = require('utilise/log')('@compone.define')
    , noop = () => {}
    , HTMLElement = client && window.HTMLElement || class {}
    , registry = client && window.customElements || {}

module.exports = function define(name, component) {
  if (arguments.length == 1) { component = name, name = `anon-${registry.anon++}` }
  if (component.hasOwnProperty('wrapper')) return component.wrapper
  if (!name.includes('-')) return;
  if (!client) return wrap(classed(component))
  let wrapped = registry.get(name)

  if (wrapped) {
    if (wrapped.class == classed(component)) return wrapped
    wrapped.class = classed(component)
    const instances = Array.from(document.querySelectorAll(name))
    instances.map(node => { // TODO: should probably await these
      node.disconnectedCallback() 
      node.methods.map(method => { delete node[method] })
      node.connectedCallback()
    })
  } else {
    registry.define(name, wrapped = wrap(classed(component)))
  }

  return wrapped
}

const styler = async (node, ...names) => {
  return node.css$ = node.css$ || ripple
  .subscribe(names)
  .map(styles => names.map(name => style(node, styles[name], ripple.resources[name].headers.hash, name)))
  .each((d, i, n) => requestAnimationFrame(n.next))
  .start(node.on('disconected').filter(() => !node.isConnected))
}

const data = async (node, ...names) => {
 if (!node.data$) node.data$ = ripple
  .subscribe(names)
  .map(data => assign(node.state, data))
  .map(() => node.render())
  .start(node.once('disconnected'))
}

const wrap = component => {
  if (!component.hasOwnProperty('wrapper'))
    component.wrapper = class extends HTMLElement {
      constructor(){
        super()
        event(this)
        this.ready = this.once('ready')
        this.state = this.state || {}
      }

      static get observedAttributes(){
        return ['css', 'data']
      }

      attributeChangedCallback(name, oldValue, newValue){
        name == 'css'
        ? styler(this, ...newValue.split(' '))
        : data(this, ...newValue.split(' '))
      }
      
      connectedCallback(){ 
        const { prototype } = component.wrapper.class
        this.methods = Object
          .getOwnPropertyNames(prototype)
          .filter(method => !(method in disallowed))
          .map(method => ((this[method] = prototype[method].bind(this)), method))

        return Promise.resolve((this.connected || noop).call(this, this, this.state))
          .then(d => {
            this.emit('ready')
            return this.render()
          })
      }

      render(){
        const { prototype } = component.wrapper.class
        return this.pending = this.pending || this.ready
          .then(() => { 
            delete this.pending
            return prototype.render.call(this, this, this.state)  
          })
      }

      disconnectedCallback(){
        (this.disconnected || noop).call(this, this, this.state)
        this.dispatchEvent(new CustomEvent('disconnected')) 
        this.initialised = false
      }

      get(sel){
        return this.querySelector(sel)
      }
    }

  component.wrapper.class = component
  return component.wrapper
}

const disallowed = { length: 1, prototype: 1, name: 1, render: 1 }

registry.anon = registry.anon || 1
