const SVG_NS = 'http://www.w3.org/2000/svg';
const CARD_WIDTH = 60;
const CARD_HEIGHT = 30;
const PORT_RADIUS = 10;
const CONTROL_COEFFICIENT = 0.05;

const strs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'

const regex = /translate\((\d+), ?(\d+)\)/;

let selectedBox = null;
let selectedLink = null;

let is_linking = false;
// 起始点的位置，用来移动位置
let start_parent_group = null;
let path_element = null;
let current_element_id = null;

let is_draging_card = false;
let current_card = null;
// 一开始的位置
let origin_pos = null;
// 一开始的元素
let start_el = null;
//let top = null;


function selectBox(e) {
    selectedBox = this

    setSelectedAppear(selectedBox, {
        'stroke': 'black',
        'stroke-width': '3'
    })
}

function setSelectedAppear(element, attrs) {
    // 这边做的很不严谨
    const rect = element.querySelector('rect')
    for (let attr in attrs) {
        rect.setAttribute(attr, attrs[attr])
    }
}

function randomString(len = 20) {
    let result = ''
    while (len--) {
        const num = Math.random() * (strs.length + 1) - 1
        result += strs[~~num]
    }
    return result
}

function getRandomColor() {
    return `#${(~~(Math.random() * (1 << 24))).toString(16)}`
}

function _selectLink(ele) {
    ele.setAttribute('stroke', 'blue')
    selectedLink = ele
}
function selectLink(e) {
    _selectLink(this)
}

function createPath(pos) {
    let top = document.querySelector('svg').getBoundingClientRect().top
    const startX = pos.x + PORT_RADIUS
    const startY = pos.y - top + PORT_RADIUS
    const movePath = `M ${startX} ${startY} L ${startX} ${startY} C ${startX} ${startY} ${startX} ${startY} ${startX} ${startY} L ${startX} ${startY}`
    current_element_id = randomString(20)
    const path = createSvgElement('path', {
        d: movePath,
        stroke: 'deeppink',
        'stroke-width': '3',
        fill: 'none'
    })
    path.id = current_element_id
    // 绑定事件，使之可以被删除
    path.addEventListener('click', selectLink, false)
    return path
}

function linkStart(e) {
    is_linking = true
    const { top, left } = e.target.getBoundingClientRect()
    const path = createPath({
        x: left,
        y: top
    })
    path_element = path

    this.parentElement.appendChild(path)
    start_parent_group = this.parentElement.parentElement
    document.querySelector('svg').appendChild(path)
}
function createRect(color) {
    const rect = createSvgElement('rect', {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        x: 0,
        y: 0,
        fill: color
    })

    return rect
}

function _createPort(position) {
    const translateX = CARD_WIDTH + PORT_RADIUS / 2
    const translateY = CARD_HEIGHT / 2
    const g = createSvgElement('g', {
        x: 0,
        y: 0,
        transform: `translate(${translateX}, ${translateY})`,
        cursor: 'pointer'
    })
    const circle = createSvgElement('circle', {
        cx: 0,
        cy: 0,
        r: PORT_RADIUS,
        fill: 'teal'
    })

    // 绑定事件，使之可以连线
    circle.addEventListener('mousedown', linkStart, false)
    g.appendChild(circle)
    return g
}

function createSvgElement(tag, props) {
    let svg = document.createElementNS(SVG_NS, tag)
    if (props !== undefined) {
        for (let item in props) {
            if (props.hasOwnProperty(item)) {
                svg.setAttribute(item, props[item])
            }
        }
    }
    return svg
}

function createCard(what, color, where) {
    const translateX = where.x - CARD_WIDTH / 2
    const translateY = where.y - CARD_HEIGHT / 2

    const parent = createSvgElement('g', {
        x: 0,
        y: 0,
        width: 50,
        height: 50,
        fill: 'blue',
        transform: `translate(${translateX}, ${translateY})`
    })

    parent.id = randomString()
    //选中变黑
    parent.addEventListener('click', selectBox, false)

    // 创建卡片节点
    const g = createSvgElement('g', {
        x: 0,
        y: 0,
        cursor: 'move'
    })

    // 创建框和文字
    const apple = createRect(color, where)
    const text = createSvgElement('text', {
        dx: 10,
        dy: CARD_HEIGHT / 2 + 5,
        fill: '#fff',
        textAnchor: 'start',
    })
    text.textContent = what

    const port = _createPort({
        x: translateX,
        y: translateY
    }, 'right')

    g.appendChild(apple)
    g.appendChild(text)

    // 交给父节点去整合整个东西
    parent.appendChild(g)
    parent.appendChild(port)

    // 绑定事件, 使之可以拖动
    g.addEventListener('mousedown', dragCard, false)

    // 绑定事件，使之可以被连接
    // 这里应该用 mouseup 的事件的，但是有问题，事件无法触发
    // 所以换用 mouseenter
    parent.addEventListener('mouseenter', linkEnd, false)

    return parent
}

function dragCard(e) {
    is_draging_card = true
    current_card = this
    start_el = this.parentElement
    top = document.querySelector('svg').getBoundingClientRect().top
    const transform = start_el.getAttribute('transform')
    const _tmp_origin_pos = transform.match(regex)
    origin_pos = {
        top: _tmp_origin_pos[1],
        left: _tmp_origin_pos[2]
    }
}

function notAEnoughPath(e) {
    const path = document.querySelector(`#${current_element_id}`)

    const attrs = path.getAttribute('d').split(' ')
    const movePos = attrs.slice(1, 3)
    const lineToPos = attrs.slice(-2)

    const dest = getDest({
        x: movePos[0],
        y: movePos[1]
    }, {
        x: lineToPos[0],
        y: lineToPos[1]
    })

    // 距离太短的就取消
    if (dest <= PORT_RADIUS) {
        linkAbort(e)
        return true
    }
    return false
}

function linkAbort(e) {
    if (!is_linking) {
        return
    }

    path_element.parentNode.removeChild(path_element)
    // gc
    is_linking = false
    path_element = null
    start_parent_group = null
}

function getDest(start, end) {
    // 算一下两点之间的距离
    return Math.sqrt(Math.pow(~~end.x - ~~start.x, 2) + Math.pow(~~end.y - ~~start.y, 2))
}

function linkEnd(e) {
    if (!is_linking) {
        return
    }

    // 如果没出自己的圆就取消掉这个连线

    if (notAEnoughPath(e)) {
        // 连接完成
        is_linking = false
        path_element = null
        return
    }

    // 保存盒子的 id 给 path，用以删除什么的。
    path_element.setAttribute('from-ele', start_parent_group.id)
    path_element.setAttribute('end-ele', this.id)

    // 连接完成
    is_linking = false
    path_element = null

    // 把指向这个box的path都存起来，移动的时候用
    const links = this.getAttribute('links') === null ? '' : this.getAttribute('links')
    const links_to_render = links === '' ? current_element_id : `${links} ${current_element_id}`
    this.setAttribute('links', links_to_render)

    // 把box的path再存一遍，存到开始指向的box里面
    const start_links = start_parent_group.getAttribute('links-start') === null ? '' : start_parent_group.getAttribute('links-start')
    const start_links_to_render = start_links === '' ? current_element_id : `${start_links} ${current_element_id}`
    start_parent_group.setAttribute('links-start', start_links_to_render)

}


function linking(e) {
    if (!is_linking) {
        return
    }

    let top = document.querySelector('svg').getBoundingClientRect().top
    const dest = {
        x: e.x,
        y: e.y - top
    }

    setEndBezierCurveValue(path_element, dest)
}


function setEndBezierCurveValue(ele, dest) {
    const attrs = ele.getAttribute('d').split(' ')
    const movePos = attrs.slice(1, 3)
    const bezierValues = _calcBezierCurveValue({
        x: movePos[0],
        y: movePos[1]
    }, {
        x: dest.x,
        y: dest.y
    })

    const result = `${attrs.slice(0, 3).join(' ')} L ${bezierValues.startX} ${bezierValues.startY} C ${bezierValues.bezierControlX1} ${bezierValues.bezierControlY1} ${bezierValues.bezierControlX2} ${bezierValues.bezierControlY2} ${bezierValues.endX} ${bezierValues.endY} L ${dest.x} ${dest.y}`
    ele.setAttribute('d', result)
}

function _calcBezierCurveValue(start, end) {
    // 两点之间的距离
    const dist = getDest(start, end)

    // 判断是向左还是向右，还有上下
    const to_where = _toWhereMeta(start, end)
    const to_left = to_where('left')

    // 设定控制点
    const controlX1 = to_left ? ~~start.x - ~~dist * CONTROL_COEFFICIENT : ~~start.x + ~~dist * CONTROL_COEFFICIENT
    const controlY1 = ~~start.y
    const controlX2 = to_left ? ~~end.x + ~~dist * CONTROL_COEFFICIENT : ~~end.x - ~~dist * CONTROL_COEFFICIENT
    const controlY2 = ~~end.y

    // 贝塞尔曲线的转折点设置
    //
    // 控制点1 的 y 其实是和起始点要一致
    // 控制点2 的 y 也应该和终点相一致
    //
    // 控制点的 x 轴的位置，这里设置的是 1/4。将整个距离分为四段，两个控制点各在第二和倒数第二个点
    const long_x = Math.abs(~~end.x - ~~start.x)
    const bezierControlX1 = to_left ? ~~start.x - long_x / 4 : ~~start.x + long_x / 4
    const bezierControlY1 = ~~start.y
    const bezierControlX2 = to_left ? ~~end.x + long_x / 4 : ~~end.x - long_x / 4
    const bezierControlY2 = ~~end.y

    return {
        startX: controlX1,
        startY: controlY1,
        bezierControlX1,
        bezierControlY1,
        bezierControlX2,
        bezierControlY2,
        endX: controlX2,
        endY: controlY2
    }
}


function _toWhereMeta(start, end) {
    return function (name) {
        switch (name) {
            case 'left':
                return end.x - start.x <= 0
            case 'right':
                return end.x - start.x >= 0
            case 'top':
                return end.y - start.y <= 0
            case 'bottom':
                return end.y - start.y >= 0
            default:
                throw new Error('please pass a valid value')
        }
    }
}


function dragStart(e) {
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('type', e.target.textContent)
}

function drop(e) {
    const clientRect = this.getBoundingClientRect()
    const type = e.dataTransfer.getData('type')
    const { x, y } = e
    const dropY = y - clientRect.top
    const card = createCard(type, getRandomColor(), {x, y: dropY})

    // this === <svg id="svg">
    this.appendChild(card)
}


function dropCard(e) {
    if (! is_draging_card) {
        return
    }
    is_draging_card = false
    origin_pos = null
    start_el = null
}

function dragingCard(e) {
    if (!is_draging_card) {
        return
    }

    const svg_to_body = this.getBoundingClientRect()

    const {clientX, clientY} = e
    const translateX = clientX - svg_to_body.left - CARD_WIDTH / 2
    const translateY = clientY - svg_to_body.top - CARD_HEIGHT / 2

    current_card.parentElement.setAttribute('transform', `translate(${translateX}, ${translateY})`)

    // 开始移动连线的位置
    moveAllLinks('links', {clientX, clientY})

    // 还得移动开始线的位置
    moveAllLinks('links-start', {clientX, clientY})
}

function moveAllLinks(attr, pos) {
    const _links = current_card.parentElement.getAttribute(attr)
    if (! _links) {
        return
    }

    const links = _links.indexOf(' ') > 0 ? _links.split(' ') : [_links]

    for (let link of links) {
        if (attr === 'links') {
            moveEndLink(link, pos)
        }else {
            moveStartLink(link, pos)
        }
    }
}

// 只抽取最后三个属性，最后三个应该是L x y的
function moveEndLink(id, pos) {
    const link = document.querySelector('#' + id)

    setEndBezierCurveValue(link, {x: pos.clientX, y: pos.clientY - top})
}

// 只抽取前三个属性，应该是M x y 的
function moveStartLink(id, pos) {
    const link = document.querySelector('#' + id)

    setStartBezierCurveValue(link, {x: pos.clientX, y: pos.clientY - top})
}