const ShapeType = {
    Circle: Symbol(0),
    Rect: Symbol(1),
    Triangle: Symbol(2),
    Line: Symbol(3)
}

class Utility {
    static convert_angle_to_radian(angle) {
        const radian = angle * Math.PI / 180;
        return radian;
    }

    static convet_radian_to_angle(radian) {
        const angle = radian * 180 / Math.PI;
        return angle;
    }

    /**
     * 2つの間のランダムな整数を得る
     * @param {*} min 最小値(以上)
     * @param {*} max 最大値(未満)
     * @returns ランダムな整数
     */
    static get_random_int(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        const result = Math.floor(Math.random() * (max - min) + min);
        return result;
    }
}

class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    update(point) {
        const temp = point.copy();
        this.x = temp.x;
        this.y = temp.y;
    }

    update_xy(x, y) {
        this.x = x;
        this.y = y;
    }

    swap() {
        let result = new Point(this.y, this.x);
        return result;
    }

    copy() {
        return new Point(this.x, this.y);
    }

    add(vector) {
        let result = new Point(this.x + vector.x, this.y + vector.y);
        return result;
    }

    sub(vector) {
        let result = new Point(this.x - vector.x, this.y - vector.y);
        return result;
    }

    /**
     * 同一点か
     * @param {Point} point 点
     * @param {Number} threshold 閾値
     */
    is_equal(point, threshold = 0.01) {
        const is_equal = Math.abs(this.x - point.x) < threshold && Math.abs(this.y - point.y) < threshold;
        return is_equal;
    }

    /**
     * 任意点を中心に回転
     * @param {*} center 任意点(nullで原点中心)
     * @param {*} angle 回転角
     * @returns 回転後の点
     */
    rotate(center, angle) {
        if (angle == 0) { return this.copy(); }

        let target = this.copy();

        const is_origin = (center == null);
        if (!is_origin) {
            target = target.sub(center);
        }

        const radian = Utility.convert_angle_to_radian(angle);
        const rotated = new Point(
            target.x * cos(radian) - target.y * sin(radian),
            target.x * sin(radian) + target.y * cos(radian)
        );
        const result = rotated.add(center);
        return result
    }

    to_string() {
        return `${this.x} ${this.y}`;
    }
}


class Shape {
    /**
     * 図形位置
     * TODO: グラデーション
     * @param {Point} center 図形中心点
     * @param {Number} size 図形の大きさ
     * @param {ShapeType} shape_type 図形の形
     * @param {String} color 色(16進数)
     */
    constructor(center, size, shape_type, color) {
        this.center = center;
        this.size = size;
        this.shape_type = shape_type;
        this.color = color;
    }

    update(center, size, shape_type) {
        this.update_xy(center);
        this.update_size(size);
        this.update_shape_type(shape_type);
    }

    update_xy(center) {
        if (center != null) { this.center = center; }
    }

    update_size(size) {
        if (size != null) { this.size = size; }
    }

    update_shape_type(shape_type) {
        if (shape_type != null) { this.shape_type = shape_type; }
    }

    update_color(color) {
        if (color != null) { this.color = color; }
    }

    draw() {
        if (this.color == null) {
            stroke(this.color);
            fill('#FFFFFF')
        }
        else {
            stroke(this.color);
            fill(this.color);
        }

        switch (this.shape_type) {
            case ShapeType.Circle:
                circle(this.center.x, this.center.y, this.size);
                break;
            case ShapeType.Rect:
                const offset = this.size / 2;
                const left_top = this.center.sub(new Point(offset, offset));
                rect(left_top.x, left_top.y, this.size, this.size);
                break;
            case ShapeType.Triangle:
                const top = this.center.sub(new Point(0, this.size / 2));
                const right = top.rotate(this.center, 120);
                const left = top.rotate(this.center, 120 * 2);
                triangle(
                    top.x, top.y,
                    right.x, right.y,
                    left.x, left.y);
                break;
            case ShapeType.Line:
                console.log('未実装の図形タイプ: Line');
            default:
                console.error(`未実装の図形タイプ: ${this.shape_type}`);
                break;
        }
    }
}

class ShapeCluster {
    /**
     * 図形の集まり
     * @param {Number} size 図形サイズ
     * @param {ShapeType} shape_type 図形の種類
     * @param {Point} center クラスターの初期位置
     * @param {Number} dispersion 分散 移動を許す範囲(四角)
     * @param {Number} move_speed 図形の移動速度
     * @param {Number} default_amount 初期図形数
     * @param {Number} min_amount 最小図形数
     * @param {Number} max_amount 最大図形数
     * @param {String} shape_color 図形色
     * @param {String} line_color 線色
     */
    constructor(size, shape_type,
        center, dispersion, move_speed,
        default_amount, min_amount, max_amount,
        shape_color, line_color) {
        // 最大図形数 多すぎると負荷が高そうなのでとりあえずこのくらいで
        this.amount_limit = 50;

        this.size = size;
        this.shape_type = shape_type;

        this.center = center;
        this.dispersion = dispersion;
        this.move_speed = move_speed;
        this.dispersion_vector = new Point(this.dispersion, this.dispersion);
        this.move_speed_vector = new Point(this.move_speed, this.move_speed);

        this.default_amount = default_amount;
        this.min_amount = min_amount;
        this.max_amount = max_amount;
        if (max_amount > this.amount_limit) { this.max_amount = this.amount_limit; }

        this.shape_color = shape_color;
        this.line_color = line_color;

        this.shapes = [];

        this.init();
    }

    /**
     * 初期化
     */
    init() {
        if (this.default_amount < 1) { return; }

        for (let i = 0; i < this.default_amount; i++) {
            const shape = this.create_shape();
            this.add_shape(shape);
        }
    }

    /**
     * 図形を作成
     * @returns 図形
     */
    create_shape() {
        const center = this.get_random_center();
        const shape = new Shape(center, this.size, this.shape_type, this.shape_color);
        return shape;
    }

    /**
     * 分散内でランダムな中心点を取得
     * @returns ランダムな中心点
     */
    get_random_center() {
        const min = this.center.sub(this.dispersion_vector);
        const max = this.center.add(this.dispersion_vector);

        const x = Utility.get_random_int(min.x, max.x);
        const y = Utility.get_random_int(min.y, max.y);

        const result = new Point(x, y);
        return result;
    }

    /**
     * 図形を追加
     * @param {Shape} 図形
     */

    add_shape(shape) {
        if (this.shapes.length > this.max_amount) { return; }
        if (shape == null) { return; }

        this.shapes.push(shape);
    }

    /**
     * 最後の図形を削除
     */
    remove_shape_last() {
        if (this.shapes.length == 0) { return; }

        this.shapes.pop();
    }

    /**
     * 指定の点にある図形を1つ削除
     * @param {Point} center 点
     */
    remove_shape(center) {
        if (this.shapes.length == 0) { return; }
        if (center == null) { return; }

        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];
            const is_equal = shape.is_equal(center);
            if (!is_equal) { continue; }

            this.shapes.slice(i, 1);
            return;
        }
    }

    move() {
        this.move_cluster();
        this.move_shapes();
    }

    /**
     * クラスターの位置を移動
     * BUG: 画面から飛び出す可能性がある
     */
    move_cluster() {
        const move_vector = this.get_random_move_vector();
        this.center.update(this.center.add(move_vector));
    }

    /**
     * 図形の位置を移動
     * BUG: 画面から飛び出す可能性がある
     */
    move_shapes() {
        for (let i = 0; i < this.shapes.length; i++) {
            const move_vector = this.get_random_move_vector();

            let center = this.shapes[i].center;
            center.update(center.add(move_vector));
        }
    }

    /**
     * 中心点移動用のランダムなベクトルを作成
     * @returns 
     */
    get_random_move_vector() {
        const vector = new Point(
            Utility.get_random_int(this.move_speed * -1, this.move_speed + 1),
            Utility.get_random_int(this.move_speed * -1, this.move_speed + 1)
        );
        return vector;
    }

    draw() {
        // 線 図形と同時に線を描画すると図形の前/背面に線が入るので分けて描画
        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];

            const is_last = (i == this.shapes.length - 1);
            const next_shape = is_last ? this.shapes[0] : this.shapes[i + 1];
            if (shape == null || next_shape == null) { continue; }

            stroke(this.line_color);
            strokeWeight(4);
            line(shape.center.x, shape.center.y, next_shape.center.x, next_shape.center.y);
        }

        // 図形
        for (let i = 0; i < this.shapes.length; i++) {
            const shape = this.shapes[i];
            shape.draw();
        }
    }
}

const canvas_size = 600;
let clusters = [];

function setup() {
    createCanvas(canvas_size, canvas_size);
    background(0, 0, 0);
    frameRate(30);

    clusters = [
        new ShapeCluster(
            20, ShapeType.Circle,
            new Point(200, 200), 100, 1,
            3, 1, 5,
            '#0FF0FF', '#FFFFF'),
        new ShapeCluster(
            20, ShapeType.Rect,
            new Point(400, 100), 50, 2,
            5, 1, 5,
            '#F1BB36', '#FFFFF'),
        new ShapeCluster(
            20, ShapeType.Triangle,
            new Point(300, 200), 200, 1,
            2, 1, 5,
            '#6FA57F', '#FFFFF')
    ];
}

async function draw() {
    background(0, 0, 0);

    for (let i = 0; i < clusters.length; i++) {
        const cluster = clusters[i];
        cluster.move();
        cluster.draw();
    }
}