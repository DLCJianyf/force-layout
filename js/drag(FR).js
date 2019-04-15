(function(doc) {
    /**
     * 斥力 +1
     * 引力 -1
     */
    var w = doc.body.clientWidth;
    var h = doc.body.clientHeight;

    var nodes = [];
    var edges = [];

    var C = 1;
    var K_r = 1000;
    var area = w * h;

    var maxIter = 2000;
    var temperature = w / 50;
    var MAX_FORCE = 1000000;

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
         */
        calculateRepulsive() {
            var distX;
            var distY;
            var dist;
            var force;

            nodes.forEach(function(node, i) {
                nodes.forEach(function(node1, j) {
                    if (i !== j) {
                        distX = node.x - node1.x + 0.1;
                        distY = node.y - node1.y;
                        dist = Math.sqrt(distX * distX + distY * distY);

                        force = (K_r * K_r) / dist;

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
            edges.forEach(function(edge) {
                var source = edge.from;
                var target = edge.to;

                var distX = source.x - target.x;
                var distY = source.y - target.y;
                var dist = Math.sqrt(distX * distX + distY * distY);

                var dsp = dist * dist;
                var force = dsp / (K_r * K_r);
                //var force = K_s * dist;

                source.vx = source.vx - (distX / dist) * force;
                source.vy = source.vy - (distY / dist) * force;
                target.vx = target.vx + (distX / dist) * force;
                target.vy = target.vy + (distY / dist) * force;
            }, this);
        },

        updateCoordinates() {
            var weight = 0.05;
            var MAX_DISPLACEMENT_SQ = 100;

            nodes.forEach(function(node) {
                var dx = node.vx * weight;
                var dy = node.vy * weight;
                // var dx = node.vx;
                // var dy = node.vy;

                // var dsp = Math.sqrt(dx * dx + dy * dy);
                // dx = (dx / dsp) * Math.min(dsp, temperature);
                // dy = (dy / dsp) * Math.min(dsp, temperature);

                // if ((dx > 0 && dx < dx1) || (dx < 0 && dx > dx1)) {
                //     dx = dx1;
                // }
                // if ((dy > 0 && dy < dy1) || (dy < 0 && dy > dy1)) {
                //     dy = dy1;
                // }

                node.vx = dx;
                node.vy = dy;

                if (!(isMouseDown && node.id === target.id)) {
                    node.x += dx;
                    node.y += dy;
                } else {
                    node.vx = 0;
                    node.vy = 0;
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
            Util.cool();
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
        if (target) {
            //times = 0;
            temperature = w / 50;
            //weight = 0.05;

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
    if (animate.canvas) {
        animate.canvas.width = w;
        animate.canvas.height = h;

        animate.addNodes(relation.nodes);
        animate.addEdges(relation.links);

        K_r = Math.sqrt(10000 / relation.nodes.length);
    }
})(document);
