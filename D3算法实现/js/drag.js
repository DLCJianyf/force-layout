(function(doc) {
    /**
     * 斥力 +1
     * 引力 -1
     */
    var w = doc.body.clientWidth;
    var h = doc.body.clientHeight;
    var colors = ["#F8E400", "#F26378", "#13DBAD", "#FF7D48", "#A2EF54"];
    var borderColor = ["#c6dbef"];

    var nodes = [];
    var edges = [];
    //节点被连接次数
    var count = [];
    //边的占比
    var bias = [];
    //弹簧劲度系数
    var strength = [];

    var alpha = 1;
    var alphaMin = 0.001;
    // alpha衰减率
    var alphaDecay = 1 - Math.pow(alphaMin, 1 / 300);
    var alphaTarget = 0;

    //鼠标拖拽信息
    var MX = null;
    var MY = null;
    var target = null;
    var useBorder = false;

    //webWorker信息
    var webWorker = null;
    var isMouseDown = false;
    //是否使用webWorker
    var useWorker = false;

    //工具类
    var Util = {
        /**
         * 根据id查找节点
         *
         * @param {Array}  arr
         * @param {String} id
         */
        find: function(arr, id) {
            for (var i = 0; i < arr.length; i++) {
                if (arr[i].id === id) {
                    return arr[i];
                }
            }
            return null;
        },

        /**
         * 计算两点之间的ulinix
         *
         * @param {Object} p1
         * @param {Object} p2
         */
        distance: function(p1, p2) {
            var $x = p1.x - p2.x;
            var $y = p1.y - p2.y;
            return Math.sqrt($x * $x + $y * $y);
        },

        /**
         * 判断点是否与原相交
         *
         * @param {Object} p
         * @param {Object} c
         */
        isPointInCircle(p, c) {
            var offset = 3;
            var dis = Util.distance(p, c) - offset;

            return c.r > dis;
        },

        /**
         * 随机数
         *
         * @param {Number} min
         * @param {Number} max
         */
        random(min, max) {
            return Math.random() * (max - min) + min;
        },

        /**
         * 模拟退火
         */
        cool() {
            alpha += (alphaTarget - alpha) * alphaDecay;
            if (alpha < 0.1) alpha = 0.1;
        },

        /**
         * 随机方向
         */
        jiggle() {
            return (Math.random() - 0.5) * 1e-6;
        },

        /**
         * 两点之间的斥力
         */
        calculateRepulsive() {
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

                        //距离特别近的话，限制斥力, 感觉并没什么毛用
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
         */
        calculateTraction() {
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

        /**
         * 点居中
         */
        center() {
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
         * 更新坐标点
         */
        updateCoordinates() {
            var node;
            var weight = 0.6;
            //冷却，减小移动幅度，提升稳定
            Util.cool();

            for (var i = 0; i < nodes.length; i++) {
                node = nodes[i];

                //位移减缓，防止震荡
                var dx = node.vx * weight;
                var dy = node.vy * weight;

                node.vx = dx;
                node.vy = dy;

                //当鼠标选中某个节点时，忽略该节点的位移
                if (isMouseDown && target && node.id === target.id) {
                    node.vx = 0;
                    node.vy = 0;
                } else {
                    node.x += dx;
                    node.y += dy;
                }

                //超出边界的情况
                if (node.x > w) node.x = w;
                if (node.y > h) node.y = h;
                if (node.x < 0) node.x = 0;
                if (node.y < 0) node.y = 0;
            }
        }
    };

    //树结构，暂时没用到
    const Tree = {
        root: null,

        find: false,

        insert: function(source, target) {
            this.find = false;

            if (!this.root) {
                this.root = {
                    node: source,
                    children: [
                        {
                            node: target,
                            distance: Util.distance(source, target),
                            children: []
                        }
                    ]
                };
                this.find = true;
            } else {
                this.recursion(this.root, source, target);
            }
        },

        recursion: function(curNode, source, target) {
            if (!this.find) {
                if (curNode.node.id === source.id) {
                    curNode.children.push({
                        node: target,
                        distance: Util.distance(curNode.node, target),
                        children: []
                    });
                    this.find = true;
                } else if (curNode.id === target.id) {
                    curNode = {
                        node: source,
                        children: [
                            {
                                node: target,
                                children: []
                            },
                            Object.assign(curNode, { distance: Util.distance(source, target) })
                        ]
                    };
                    this.find = true;
                } else {
                    curNode.children.forEach(function(chNode) {
                        recursion(chNode, source, target);
                    });
                }
            }
        }
    };

    //节点类
    function Node(n, size) {
        this.id = n.id;
        this.size = size;
    }
    Node.prototype = {
        init: function(index) {
            // this.x = random(0, win.innerWidth);
            // this.y = random(0, win.innerWidth);

            this.x = Util.random(w / 2 - 100, w / 2 + 100);
            this.y = Util.random(h / 2 - 100, h / 2 + 100);
            //this.r = 3;
            this.r = Math.sqrt(this.size) / 10 || 4.5;
            //this.color = this.size ? "#fd8d3c" : "#c6dbef";
            this.color = colors[parseInt(Util.random(0, colors.length))];

            this.vx = 0;
            this.vy = 0;
            this.index = index;
        }

        // draw: function() {
        //     animate.offCtx.beginPath();
        //     animate.offCtx.fillStyle = this.color;
        //     animate.offCtx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        //     animate.offCtx.fill();
        // }
    };

    //连接线类
    function Edge(from, to, index) {
        this.from = from;
        this.to = to;
        this.index = index;
        //this.dis = Util.distance(from, to);
    }
    // Edge.prototype = {
    //     draw: function() {
    //         animate.offCtx.strokeStyle = "#FFFFFF";
    //         animate.offCtx.lineWidth = 2;
    //         animate.offCtx.beginPath();
    //         animate.offCtx.moveTo(this.from.x, this.from.y);
    //         animate.offCtx.lineTo(this.to.x, this.to.y);
    //         animate.offCtx.stroke();
    //     }
    // };

    //动画控制及布局
    var animate = {
        ctx: null,

        offCtx: null,

        canvas: null,

        offCanvas: null,

        /**
         * 初始化canvas，两个
         */
        initCanvas: function() {
            if (!this.canvas) {
                this.canvas = document.querySelector("#canvas");
                this.ctx = this.getCtx(w, h, this.canvas, false);

                this.offCanvas = document.createElement("canvas");
                this.offCtx = this.getCtx(w, h, this.offCanvas, true);
            }
        },

        /**
         * 获取绘图对象
         *
         * @param {Number}  w
         * @param {Number}  h
         * @param {Cnavas}  canvas
         * @param {Boolean} isOffCanvas
         */
        getCtx(w, h, canvas, isOffCanvas) {
            canvas.width = w;
            canvas.height = h;

            return canvas.getContext("2d", { willReadFrequently: isOffCanvas });
        },

        /**
         * 计算下一帧的节点信息
         */
        updateNodes: function() {
            Util.calculateRepulsive();
            Util.calculateTraction();
            Util.center();
            Util.updateCoordinates();
        },

        /**
         * 添加节点
         *
         * @param {Array} nodes1
         */
        addNodes: function(nodes1) {
            nodes1.forEach(function(n, index) {
                var node = new Node(n, n.size);
                node.init(index);
                nodes.push(node);
            });
        },

        /**
         * 添加边线
         *
         * @param {Array} links
         */
        addEdges: function(links) {
            links.forEach(function(link, index) {
                var n1 = Util.find(nodes, link.source);
                var n2 = Util.find(nodes, link.target);

                if (n1 && n2) {
                    var edge = new Edge(n1, n2, index);
                    edges.push(edge);

                    count[n1.index] = (count[n1.index] || 0) + 1;
                    count[n2.index] = (count[n2.index] || 0) + 1;
                }
            });

            //计算边线占比信息
            var m = edges.length;
            for (i = 0, bias = new Array(m); i < m; i++) {
                var link = edges[i];
                bias[i] = count[link.from.index] / (count[link.from.index] + count[link.to.index]);
                strength[i] = 1 / Math.min(count[link.from.index], count[link.to.index]);
            }
        },

        /**
         * 清楚画布
         */
        clear: function() {
            this.offCtx.clearRect(0, 0, w, h);
            this.offCtx.globalAlpha = 1.0;
        },

        /**
         * 动画，每一帧的起点
         */
        step: function() {
            animate.clear();

            //是否支持，使用webWorker
            if (useWorker && webWorker) {
                Util.cool();
                webWorker.onmessage = function(evt) {
                    nodes = evt.data.nodes;
                    edges = evt.data.edges;
                    animate.draw();
                };
                webWorker.postMessage(
                    JSON.stringify({
                        nodes: nodes,
                        edges: edges,
                        alpha: alpha,
                        strength: strength,
                        bias: bias,
                        isMouseDown: isMouseDown,
                        id: target && target.id,
                        w: w,
                        h: h
                    })
                );
            } else {
                animate.updateNodes();
                animate.draw();
            }
        },

        /**
         * 绘制
         */
        draw() {
            for (var node of nodes) {
                animate.drawNode(node);
            }

            for (var edge of edges) {
                animate.drawEdge(edge);
            }

            animate.ctx.putImageData(animate.offCtx.getImageData(0, 0, w, h), 0, 0);

            window.requestAnimationFrame(animate.step);
        },

        /**
         * 绘制节点
         *
         * @param {Object} node
         */
        drawNode(node) {
            //webWorker兼容处理
            if (isMouseDown && target && node.id === target.id) {
                node.x = target.x;
                node.y = target.y;
            }
            animate.offCtx.beginPath();
            animate.offCtx.fillStyle = node.color;
            animate.offCtx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
            animate.offCtx.fill();

            if (useBorder) {
                animate.offCtx.strokeStyle = "#c6dbef";
                animate.offCtx.lineWidth = 2;
                animate.offCtx.stroke();
            }
        },

        /**
         * 绘制边线
         *
         * @param {Object} edge
         */
        drawEdge(edge) {
            //webWorker兼容处理
            if (isMouseDown && target) {
                if (edge.from.id === target.id) {
                    edge.from.x = target.x;
                    edge.from.y = target.y;
                }

                if (edge.to.id === target.id) {
                    edge.to.x = target.x;
                    edge.to.y = target.y;
                }
            }

            animate.offCtx.strokeStyle = "#FFFFFF";
            animate.offCtx.lineWidth = 1;
            animate.offCtx.beginPath();
            animate.offCtx.moveTo(edge.from.x, edge.from.y);
            animate.offCtx.lineTo(edge.to.x, edge.to.y);
            animate.offCtx.stroke();
        }
    };

    animate.initCanvas();
    animate.step();

    window.onmousedown = function(e) {
        target = null;
        isMouseDown = true;

        MX = e.clientX;
        MY = e.clientY;

        var node;
        var isInCircle = false;
        for (var i = 0; i < nodes.length; i++) {
            node = nodes[i];
            isInCircle = Util.isPointInCircle({ x: MX, y: MY }, node);
            if (isInCircle) {
                target = node;
                break;
            }
        }
    };
    window.onmousemove = function(e) {
        if (isMouseDown && target) {
            alpha = 1;

            var dx = e.clientX - MX;
            var dy = e.clientY - MY;

            target.x += dx;
            target.y += dy;

            MX = e.clientX;
            MY = e.clientY;
        }
    };
    window.onmouseup = function(e) {
        isMouseDown = false;
        target = null;
    };

    // window.onresize = function() {
    //     if (animate.canvas) {
    //         animate.canvas.width = w;
    //         animate.canvas.height = h;

    //         animate.addNodes(relation.nodes);
    //         animate.addEdges(relation.links);

    //         K_r = Math.sqrt(10000 / relation.nodes.length);
    //     }
    // };
    // window.onresize();
    if (useWorker && window.Worker && !webWorker) {
        webWorker = new Worker("../worker/worker.js");
    }
    if (animate.canvas) {
        animate.canvas.width = w;
        animate.canvas.height = h;

        animate.addNodes(relation.nodes);
        animate.addEdges(relation.links);
    }
})(document);
