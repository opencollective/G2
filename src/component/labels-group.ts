import { each, filter, get, isBoolean, isFunction } from '@antv/util';
import { IGroup, IShape } from '../dependents';
import { LooseObject } from '../interface';
import { bboxAdjust, positionAdjust, spiralAdjust } from '../util/adjust-labels';
import { rotate } from '../util/transform';

export interface LabelsGroupCfg {
  container: IGroup;
  adjustType?: string;
  items?: LooseObject[];
  shapes?: IShape[];
}

const LAYOUTS = {
  scatter: positionAdjust,
  map: spiralAdjust,
  treemap: bboxAdjust,
};

/**
 * Geometry label 组件
 */
export default class LabelsGroup {
  /** 用于指定 label 布局的类型 */
  public adjustType: string;
  // TODO: 类型定义
  /** 文本的数据结合 */
  public items: LooseObject[];
  /** 图形容器 */
  public container: IGroup;
  /** label 的 shape 集合 */
  public shapes: IShape[];

  private linesGroup: IGroup;
  private labelsGroup: IGroup;

  constructor(cfg: LabelsGroupCfg) {
    const { adjustType = 'default', items, container, shapes } = cfg;

    this.adjustType = adjustType;
    this.items = items;
    this.container = container;
    this.shapes = shapes;

    this.linesGroup = container.addGroup({
      name: 'label-line',
    });
    this.labelsGroup = container.addGroup({
      name: 'label',
    });
  }

  /**
   * Renders labels group
   */
  public render() {
    const items = this.items;
    const labelShapes = this.getLabelShapes();
    const count = labelShapes.length;
    each(items, (item: any, index: number) => {
      if (index < count) {
        this.updateLabel(labelShapes[index], item);
      } else {
        this.renderLabel(item);
      }
    });
    for (let i = count - 1; i >= items.length; i -= 1) {
      labelShapes[i].remove();
    }
    this.adjustLabels();
    this.drawLines();
  }

  public clear() {
    const { linesGroup, labelsGroup } = this;
    linesGroup.clear();
    labelsGroup.clear();
  }

  public destroy() {
    const { linesGroup, labelsGroup } = this;
    linesGroup.destroy();
    labelsGroup.destroy();
  }

  private getLabelShapes(): IShape[] {
    const children = this.labelsGroup.get('children');
    return filter(children, (child) => !child.isGroup());
  }

  private updateLabel(oldLabel: IShape, newCfg: any) {
    if (!oldLabel) {
      return;
    }

    oldLabel.attr('text', newCfg.content);
    if (oldLabel.attr('x') !== newCfg.x || oldLabel.attr('y') !== newCfg.y) {
      oldLabel.resetMatrix();
      if (newCfg.rotate) {
        rotate(oldLabel, newCfg.rotate);
      }
      oldLabel.attr(newCfg);
    }
  }

  private renderLabel(cfg: any) {
    const labelsGroup = this.labelsGroup;
    const labelShape = labelsGroup.addShape('text', {
      attrs: {
        x: cfg.x,
        y: cfg.y,
        textAlign: cfg.textAlign,
        text: cfg.content,
        ...cfg.style,
      },
      // name: this.name, // TODO: 设置 name，用于事件捕获
    });

    if (cfg.rotate) {
      rotate(labelShape, cfg.rotate);
    }
    labelShape.set('origin', cfg.origin || cfg); // TODO
    return labelShape;
  }

  // 根据type对label布局
  private adjustLabels() {
    const type = this.adjustType;
    const labels = this.getLabelShapes();
    const shapes = this.shapes;
    const layout = LAYOUTS[type];
    if (!layout) {
      return;
    }
    layout(labels, shapes);
  }

  private drawLines() {
    let linesGroup = this.linesGroup;
    if (!linesGroup || linesGroup.destroyed) {
      linesGroup = this.container.addGroup({
        name: 'label-line',
      });
    } else {
      linesGroup.clear();
    }
    this.linesGroup = linesGroup;
    each(this.items, (labelCfg: any) => {
      this.lineToLabel(labelCfg, linesGroup);
    });
  }

  // TODO: 需要配合最终的配置项解析
  private lineToLabel(labelCfg: any, lineGroup: IGroup) {
    if (!labelCfg.labelLine) {
      // labelLine: null | false，关闭 label 对应的 labelLine
      return;
    }
    const lineStyle = get(labelCfg.labelLine, 'style', {});
    let path = lineStyle.path;
    // TODO: 这个有应用场景吗？
    if (path && isFunction(lineStyle.path)) {
      // path 支持回调
      path = lineStyle.path(labelCfg);
    }
    if (!path) {
      const start = labelCfg.start;
      path = [
        ['M', start.x, start.y],
        ['L', labelCfg.x, labelCfg.y],
      ];
    }
    let stroke = labelCfg.color;
    if (!stroke) {
      if (labelCfg.style && labelCfg.style.fill) {
        stroke = labelCfg.style.fill; // 通文本颜色相同
      } else {
        stroke = '#000';
      }
    }
    lineGroup.addShape('path', {
      capture: false, // TODO: 开启开始关闭？
      attrs: {
        path,
        stroke,
        fill: null,
        ...lineStyle,
      },
      // name: this.name
    });
  }
}
