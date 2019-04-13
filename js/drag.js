(function(win) {
    /**
     * 斥力 +1
     * 引力 -1
     */
    var w = win.innerWidth;
    var h = win.innerHeight;

    var nodes = [];
    var edges = [];

    var C = 1;
    var K = 1000;
    var maxIter = 2000;
    var temperature = w / 100;

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
            return Math.sqrt(
                Math.pow(Math.abs(p1.x - p2.x), 2),
                Math.pow(Math.abs(p1.y - p2.y), 2)
            );
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
            temperature *= 1.0 - curIter / maxIter;
        },

        jiggle() {
            return (Math.random() - 0.5) * 1e-6;
        },

        /**
         * 两点之间的斥力
         */
        calculateRepulsive() {
            var distX;
            var distY;
            var dist;

            nodes.forEach(function(node, i) {
                nodes.forEach(function(node1, j) {
                    if (i !== j) {
                        distX = node.x - node1.x;
                        distY = node.y - node1.y;
                        dist = Math.sqrt(distX * distX + distY * distY);

                        var force = (K * K) / dist;
                        node.vx = node.vx + (distX / dist) * force;
                        node.vy = node.vy + (distY / dist) * force;
                    }
                });
            });
        },

        /**
         * 两点连线之间的引力
         */
        calculateTraction() {
            var condenseFactor = 3;

            edges.forEach(function(edge) {
                var source = edge.from;
                var target = edge.to;

                var distX = source.x - target.x;
                var distY = source.y - target.y;
                var dist = Math.sqrt(distX * distX + distY * distY);

                var force = (dist * dist) / K;

                source.vx = source.vx - (distX / dist) * force;
                source.vy = source.vy - (distY / dist) * force;
                target.vx = target.vx + (distX / dist) * force;
                target.vy = target.vy + (distY / dist) * force;

                // if (isNaN(source.vx)) {
                //     debugger;
                // }
                //debugger;
            }, this);
        },

        updateCoordinates() {
            var weight = 50;

            nodes.forEach(function(node) {
                var dx = node.vx / weight;
                var dy = node.vy / weight;

                // var dsp = Math.sqrt(dx * dx + dy * dy);
                // dx = (dx / dsp) * Math.min(dsp, temperature);
                // dy = (dy / dsp) * Math.min(dsp, temperature);

                node.vx = dx;
                node.vy = dy;

                if (!(isMouseDown && node.id === target.id)) {
                    node.x += dx;
                    node.y += dy;
                } else {
                }
            });

            //temperature *= 0.95;
            //Util.cool(times++);
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
            //this.r = Util.random(minR, maxR);
            this.color = "#FFFFFF";
            //this.color = colors[parseInt(random(0, colors.length))];

            //this.speed = random(0, 0.5);

            // this.vx = random(-1, 1);
            // this.vy = random(-1, 1);
            this.force = [0.1, 0.1];
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
                }
            });
        },

        clear: function() {
            this.offCtx.clearRect(0, 0, win.innerWidth, win.innerHeight);
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

            win.requestAnimationFrame(animate.step);
        }
    };

    animate.initCanvas();
    animate.step();

    win.onmousedown = function(e) {
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
    win.onmousemove = function(e) {
        if (target) {
            times = 0;
            temperature = w / 100;

            var dx = e.clientX - MX;
            var dy = e.clientY - MY;

            target.x += dx;
            target.y += dy;

            MX = e.clientX;
            MY = e.clientY;
        }
    };
    win.onmouseup = function(e) {
        isMouseDown = false;
        target = null;
    };

    win.onresize = function() {
        if (animate.canvas) {
            animate.canvas.width = win.innerWidth;
            animate.canvas.height = win.innerHeight;

            animate.addNodes(relation.nodes);
            animate.addEdges(relation.links);

            K = Math.sqrt(40000 / relation.nodes.length);
        }
    };
    win.onresize();
})(this);
