var alpha = 1;
var alphaMin = 0.001;
// alpha衰减率
var alphaDecay = 1 - Math.pow(alphaMin, 1 / 300);
var alphaTarget = 0;

this.addEventListener("message", function(evt) {
    var data = JSON.parse(evt.data);
    updateNodes(
        data.nodes,
        data.edges,
        data.alpha,
        data.strength,
        data.bias,
        data.w,
        data.h,
        data.isMouseDown,
        data.id
    );

    postMessage({ nodes: data.nodes, edges: data.edges });
});

var Util = {
    find: function(arr, id) {
        for (var i = 0; i < arr.length; i++) {
            if (arr[i].id === id) {
                return arr[i];
            }
        }
        return null;
    },

    distance: function(p1, p2) {
        return Math.sqrt(Math.pow(Math.abs(p1.x - p2.x), 2), Math.pow(Math.abs(p1.y - p2.y), 2));
    },

    isPointInCircle(p, c) {
        var offset = 1;
        var dis = Util.distance(p, c) - offset;

        return c.r > dis;
    },

    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    cool(curIter) {
        //temperature *= 1.0 - curIter / maxIter;
        var r = 0.8;
        temperature *= r * r;
    },

    jiggle() {
        return (Math.random() - 0.5) * 1e-6;
    },

    /**
     * 两点之间的斥力
     *
     * @param {Array}  nodes
     * @param {Number} alpha
     */
    calculateRepulsive(nodes, alpha) {
        var val = 18;
        var theta2 = 0.81;
        var distanceMin2 = 1;
        var distanceMax2 = Infinity;
        var node, node1;

        for (var i = 0, length = nodes.length; i < length; i++) {
            for (var j = 0; j < length; j++) {
                if (i !== j) {
                    node = nodes[i];
                    node1 = nodes[j];

                    var w = node.x - node1.x;
                    var distX = node.x - node1.x || Util.jiggle();
                    var distY = node.y - node1.y || Util.jiggle();
                    var l = distX * distX + distY * distY;
                    var dist = Math.sqrt(l);

                    //两个点重合的话随机给方向
                    if (distX === 0) (distX = Util.jiggle()), (l += distX * distX);
                    if (distY === 0) (distY = Util.jiggle()), (l += distY * distY);

                    //距离特别近的话，限制斥力,
                    if ((w * w) / theta2 < l) {
                        if (l < distanceMax2) {
                            if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
                            node.vx += (distX * val * alpha) / l;
                            node.vy += (distY * val * alpha) / l;
                        }
                    } else {
                        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);
                        w = (val * alpha) / l;
                        node.vx += distX * w;
                        node.vy += distY * w;
                    }

                    // if (dist < 1) dist = Math.sqrt(dist * 1);
                    // node.vx += (distX * val * alpha) / (dist * dist);
                    // node.vy += (distY * val * alpha) / (dist * dist);
                }
            }
        }
    },

    /**
     * 两点连线之间的引力
     *
     * @param {Array}  edges
     * @param {Array}  strength
     * @param {Array}  bias
     * @param {Number} alpha
     */
    calculateTraction(edges, strength, bias, alpha) {
        var edge;
        var distance = 30;
        for (var index = 0; index < edges.length; index++) {
            edge = edges[index];

            var source = edge.from;
            var target = edge.to;

            var distX = target.x + target.vx - source.x - source.vx || Util.jiggle();
            var distY = target.y + target.vy - source.y - source.vy || Util.jiggle();
            var dist = Math.sqrt(distX * distX + distY * distY);

            dist = ((dist - distance) / dist) * strength[index] * alpha;
            (distX *= dist), (distY *= dist);

            target.vx = target.vx - distX * (b = bias[index]);
            target.vy = target.vy - distY * b;
            source.vx = source.vx + distX * (b = 1 - b);
            source.vy = source.vy + distY * b;
        }
    },

    center(nodes, alpha, w, h) {
        // var i,
        //     n = nodes.length,
        //     node,
        //     x = 400,
        //     y = 400,
        //     sx = 0,
        //     sy = 0;
        // for (i = 0; i < n; ++i) {
        //     (node = nodes[i]), (sx += node.x), (sy += node.y);
        // }
        // for (sx = sx / n - x, sy = sy / n - y, i = 0; i < n; ++i) {
        //     (node = nodes[i]), (node.x -= sx), (node.y -= sy);
        // }
        // var radiuses = 400;
        // for (var i = 0, n = nodes.length; i < n; ++i) {
        //     var node = nodes[i],
        //         dx = node.x - 400 || 1e-6,
        //         dy = node.y - 400 || 1e-6,
        //         r = Math.sqrt(dx * dx + dy * dy),
        //         k = ((radiuses - r) * (strength[i] || 1) * alpha) / r;
        //     node.vx -= dx * k * 0.02;
        //     node.vy -= dy * k * 0.02;
        // }

        //权重，中心店吸引力减缓参数
        var strength = 0.1;
        //计算中心点;
        var px = w / 2;
        var py = h / 2;
        //px > py ? (px = py) : (py = px);

        for (var i = 0, n = nodes.length, node; i < n; ++i) {
            (node = nodes[i]),
                //越靠近中心点，中心点吸引力越小
                (node.vy += (py - node.y) * strength * alpha),
                (node.vx += (px - node.x) * strength * alpha);
        }
    },

    /**
     * 根据斥力与引力得到的偏移量计算点的位置
     *
     * @param {Array}    nodes
     * @param {Number}   w
     * @param {Number}   h
     * @param {Boolean} isMouseDown
     * @param {String} id
     */
    updateCoordinates(nodes, w, h, isMouseDown, id) {
        var node;
        var weight = 0.6;
        alpha += (alphaTarget - alpha) * alphaDecay;

        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];

            var dx = node.vx * weight;
            var dy = node.vy * weight;

            node.vx = dx;
            node.vy = dy;

            if (isMouseDown && node.id === id) {
                node.vx = 0;
                node.vy = 0;
            } else {
                node.x += dx;
                node.y += dy;
            }

            if (node.x > w) node.x = w;
            if (node.y > h) node.y = h;
            if (node.x < 0) node.x = 0;
            if (node.y < 0) node.y = 0;
        }
    }
};

/**
 * 更新点的移动距离
 *
 * @param {Array}   nodes        点
 * @param {Array}   edges        线
 * @param {Number}  alpha        退火参数
 * @param {Array}   strength
 * @param {Array}   bias
 * @param {Number}  w            画布宽
 * @param {Number}  h            画布高
 * @param {Boolean} isMouseDown  鼠标按下
 * @param {String}  id
 */
function updateNodes(nodes, edges, alpha, strength, bias, w, h, isMouseDown, id) {
    Util.calculateRepulsive(nodes, alpha);
    Util.calculateTraction(edges, strength, bias, alpha);
    Util.center(nodes, alpha, w, h);
    Util.updateCoordinates(nodes, w, h, isMouseDown, id);
}
