(function(doc) {
    /**
     * 斥力 +1
     * 引力 -1
     */
    var w = doc.body.clientWidth;
    var h = doc.body.clientHeight;

    var nodes = [];
    var edges = [];
    var count = [];
    var bias = [];
    var strength = [];

    var C = 1;
    var K_r = 18;
    var area = w * h;

    var MAX_FORCE = 1000000;
    var alpha = 1;
    var alphaMin = 0.001;
    var decay = 0.4;
    // alpha衰减率
    var alphaDecay = 1 - Math.pow(alphaMin, 1 / 300);
    var alphaTarget = 0;

    var MX = null;
    var MY = null;
    var minR = 1;
    var maxR = 3;
    var times = 0;

    var target = null;
    var isMouseDown = false;

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
            var $x = p1.x - p2.x;
            var $y = p1.y - p2.y;
            return Math.sqrt($x * $x + $y * $y);
        },

        isPointInCircle(p, c) {
            var offset = 3;
            var dis = Util.distance(p, c) - offset;

            return c.r > dis;
        },

        random(min, max) {
            return Math.random() * (max - min) + min;
        },

        cool(curIter) {
            //temperature *= 1.0 - curIter / maxIter;
            alpha += (alphaTarget - alpha) * alphaDecay;
            if (alpha < 0.1) alpha = 0.1;
        },

        jiggle() {
            return (Math.random() - 0.5) * 1e-6;
        },

        /**
         * 两点之间的斥力
         */
        calculateRepulsive() {
            var distanceMin2 = 0.81;

            nodes.forEach(function(node, i) {
                nodes.forEach(function(node1, j) {
                    if (i !== j) {
                        var distX = node.x - node1.x;
                        var distY = node.y - node1.y;
                        var l = distX * distX + distY * distY;
                        l = l < 1 ? 1 : l;

                        if (distX === 0) (distX = Util.jiggle()), (l += distX * distX);
                        if (distY === 0) (distY = Util.jiggle()), (l += distY * distY);

                        if (l < distanceMin2) l = Math.sqrt(distanceMin2 * l);

                        var dist = Math.sqrt(l);

                        var force = K_r / l;
                        //force = 1 / dist;

                        node.vx = node.vx + distX * force;
                        node.vy = node.vy + distY * force;
                    }
                });
            });
        },

        /**
         * 两点连线之间的引力
         */
        calculateTraction() {
            edges.forEach(function(edge, index) {
                var source = edge.from;
                var target = edge.to;

                var distX = target.x + target.vx - source.x - source.vx || Util.jiggle();
                var distY = target.y + target.vy - source.y - source.vy || Util.jiggle();
                var dist = Math.sqrt(distX * distX + distY * distY);

                //var dsp = dist * dist;
                var force = ((dist - 30) / dist) * strength[index];
                //var force = ((dist - 30)) / dist;

                target.vx = target.vx - distX * force * (b = bias[index]);
                target.vy = target.vy - distY * force * b;
                source.vx = source.vx + distX * force * (b = 1 - b);
                source.vy = source.vy + distY * force * b;
            }, this);
        },

        updateCoordinates() {
            var weight = 0.6;
            alpha += (alphaTarget - alpha) * alphaDecay;

            nodes.forEach(function(node) {
                var dx = node.vx * weight * alpha;
                var dy = node.vy * weight * alpha;
                console.log(node.vx, node.vy);
                // var dx = node.vx;
                // var dy = node.vy;

                node.vx = dx;
                node.vy = dy;

                if (!(isMouseDown && node.id === target.id)) {
                    node.x += dx;
                    node.y += dy;
                }

                // console.log(dx, dy);
                // console.log(temperature);
                // console.log("------------");

                if (node.x > w) node.x = w;
                if (node.y > h) node.y = h;
                if (node.x < 0) node.x = 0;
                if (node.y < 0) node.y = 0;
            });

            //temperature *= 0.95;
            //Util.cool();
        }
    };

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

    function Node(n) {
        this.id = n.id;
    }
    Node.prototype = {
        init: function(index) {
            // this.x = random(0, win.innerWidth);
            // this.y = random(0, win.innerWidth);

            this.x = Util.random(w / 2 - 100, w / 2 + 100);
            this.y = Util.random(h / 2 - 100, h / 2 + 100);
            this.r = 3;
            this.color = "#FFFFFF";

            this.vx = 0;
            this.vy = 0;
            this.index = index;
        },

        draw: function() {
            animate.offCtx.beginPath();
            animate.offCtx.fillStyle = this.color;
            animate.offCtx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            animate.offCtx.fill();
        }
    };

    function Edge(from, to, index) {
        this.from = from;
        this.to = to;
        this.index = index;
        //this.dis = Util.distance(from, to);
    }
    Edge.prototype = {
        draw: function() {
            animate.offCtx.strokeStyle = "#FFFFFF";
            animate.offCtx.lineWidth = 2;
            animate.offCtx.beginPath();
            animate.offCtx.moveTo(this.from.x, this.from.y);
            animate.offCtx.lineTo(this.to.x, this.to.y);
            animate.offCtx.stroke();
        }
    };

    var animate = {
        ctx: null,

        offCtx: null,

        canvas: null,

        offCanvas: null,

        initCanvas: function() {
            if (!this.canvas) {
                this.canvas = document.querySelector("#canvas");
                this.ctx = this.getCtx(w, h, this.canvas, false);

                this.offCanvas = document.createElement("canvas");
                this.offCtx = this.getCtx(w, h, this.offCanvas, true);
            }
        },

        getCtx(w, h, canvas, isOffCanvas) {
            canvas.width = w;
            canvas.height = h;

            return canvas.getContext("2d", { willReadFrequently: isOffCanvas });
        },

        updateNodes: function() {
            Util.calculateRepulsive();
            Util.calculateTraction();
            //Util.center();
            Util.updateCoordinates();
        },

        addNodes: function(nodes1) {
            nodes1.forEach(function(n, index) {
                var node = new Node(n);
                node.init(index);
                nodes.push(node);
            });
        },

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

        clear: function() {
            this.offCtx.clearRect(0, 0, w, h);
            this.offCtx.globalAlpha = 1.0;
        },

        step: function() {
            animate.clear();
            animate.updateNodes();

            for (var node of nodes) {
                node.draw();
            }

            for (var edge of edges) {
                edge.draw();
            }

            animate.ctx.putImageData(animate.offCtx.getImageData(0, 0, w, h), 0, 0);

            window.requestAnimationFrame(animate.step);
        }
    };

    animate.initCanvas();
    animate.step();

    window.onmousedown = function(e) {
        MX = e.clientX;
        MY = e.clientY;

        let isInCircle = false;
        nodes.forEach(function(node) {
            if (!isInCircle) {
                isInCircle = Util.isPointInCircle({ x: MX, y: MY }, node);
                if (isInCircle) {
                    target = node;
                    isMouseDown = true;
                }
            }
        });
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
        //target = null;
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
    if (animate.canvas) {
        animate.canvas.width = w;
        animate.canvas.height = h;

        animate.addNodes(relation.nodes);
        animate.addEdges(relation.links);

        //K_r = 10000 / relation.nodes.length;
    }
})(document);
