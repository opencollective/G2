import { get, map } from '@antv/util';
import { IGroup } from '../../dependents';
import { MappingDatum } from '../../interface';
import Geometry from '../base';
import Element from '../element';
import { LabelOption } from '../interface';
import GeometryLabels from './base';
import { getGeometryLabels, registerGeometryLabels } from './index';
import IntervalLabels from './interval';
import PieLabels from './pie';
import PolarLabels from './polar';

interface GeometryLabelsControllerCfg {
  geometry: Geometry;
  container: IGroup;
}

export default class GeometryLabelsController {
  public geometry: Geometry;
  // labels 的容器
  public container: IGroup;

  constructor(cfg: GeometryLabelsControllerCfg) {
    const { geometry, container } = cfg;
    this.geometry = geometry;
    this.container = container;
  }

  public render(data: MappingDatum[]) {
    const shapes = this.geometry.elements.map((element: Element) => {
      return element.shape;
    });

    this.createGeometryLabel(data, shapes);
  }

  private createGeometryLabel(mappintArray: MappingDatum[], shapes) {
    const geometry = this.geometry;
    const labelOption = geometry.labelOption as LabelOption;
    const geometryType = geometry.type;
    const coordinate = geometry.coordinate;
    const Ctor = this.getGeometryLabelsConstructor(get(labelOption, ['cfg', 'type']), coordinate.type, geometryType);
    const container = this.container;

    const scales = map(labelOption.fields, (field: string) => geometry.createScale(field));

    const geometryLabel = new Ctor(geometry);

    geometryLabel.renderLabels(mappintArray, shapes);
    // const labelsContainer = container.addGroup(Ctor, {
    //   labelOptions: _.mix(
    //     {
    //       scales,
    //     },
    //     labelOptions,
    //   ),
    //   coord,
    //   element,
    //   elementType,
    //   theme: element.get('theme'),
    //   visible: element.get('visible'),
    // });
    // this.labelsContainer = labelsContainer;
  }

  private getGeometryLabelsConstructor(labelType: string, coordinateType: string, geometryType: string) {
    let type = labelType || 'base';
    if (type === 'base') {
      if (coordinateType === 'polar') {
        type = 'polar';
      } else if (coordinateType === 'theta') {
        // 饼图文本
        type = 'pie';
      } else if (geometryType === 'interval' || geometryType === 'polygon') {
        type = 'interval';
      }
    }

    return getGeometryLabels(type);
  }
}

// TODO: 测试后面移到 index.ts 中去，同时还要保证没有 label 注册也能运行~~~~
registerGeometryLabels('base', GeometryLabels);
registerGeometryLabels('interval', IntervalLabels);
registerGeometryLabels('polar', PolarLabels);
registerGeometryLabels('pie', PieLabels);
