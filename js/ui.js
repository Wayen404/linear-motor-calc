/**
 * UI 交互模块
 */
const UI = {
  // 运动参数 ID → 显示标签映射
  motionFields: [
    { id: 'stroke',      key: 'S',      label: '总行程 S' },
    { id: 'maxVelocity', key: 'Vmax',   label: '最大速度 Vmax' },
    { id: 'acceleration',key: 'a',      label: '加速度 a' },
    { id: 'motionTime',  key: 't_run',  label: '运动时间 trun' },
  ],

  /** 电机参数输入 ID 列表（由电机选择自动填充） */
  motorFieldIds: ['primaryMass', 'forceConstant', 'contCurrent', 'peakCurrent', 'magAttraction'],

  /** 上一次推导的字段 key 列表 */
  _lastDerivedKeys: [],

  init() {
    document.getElementById('calcBtn').addEventListener('click', () => this.calculate());
    document.querySelectorAll('.param-input').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.calculate();
      });
      el.addEventListener('focus', () => {
        // 如果聚焦的是运动参数，清除推导样式
        if (el.classList.contains('motion-param')) this.clearDerivedStyles();
      });
      el.addEventListener('input', () => {
        // 用户在运动参数输入框中打字时，清除之前推导字段的值
        // 如果当前编辑的是推导字段（如 Vmax/a），不清除它自己，只清其他
        // 如果当前编辑的是非推导字段（如 S/t_run），清除所有推导字段
        if (el.classList.contains('motion-param') && this._lastDerivedKeys.length > 0) {
          const field = this.motionFields.find(f => f.id === el.id);
          const isDerivedField = field && this._lastDerivedKeys.includes(field.key);
          this.clearDerivedValues(isDerivedField ? field.key : undefined);
        }
      });
    });
    document.getElementById('motorSelect').addEventListener('change', (e) => this.onMotorChange(e));

    // 电机分类切换
    document.getElementById('motorCategory').addEventListener('change', (e) => this.onMotorCategoryChange(e));
    this.populateMotorOptions(document.getElementById('motorCategory').value);

    // 禁止滚轮更改数字输入值
    document.querySelectorAll('.param-input[type="number"]').forEach(el => {
      el.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
    });
  },

  /** 清除所有推导样式 */
  clearDerivedStyles() {
    this.motionFields.forEach(({ id }) => {
      const el = document.getElementById(id);
      const wrapper = el?.closest('.input-wrapper');
      if (wrapper) wrapper.classList.remove('derived');
      el?.classList.remove('derived');
      const badge = el?.parentElement?.querySelector('.derived-badge');
      if (badge) badge.remove();
    });
  },

  /** 清除之前推导字段的值（用户在运动参数输入框中打字时触发）
   *  @param {string} [skipKey] - 不清除的字段 key（当前正在编辑的字段） */
  clearDerivedValues(skipKey) {
    if (this._lastDerivedKeys.length === 0) return;
    this.motionFields.forEach(({ id, key }) => {
      if (this._lastDerivedKeys.includes(key) && key !== skipKey) {
        document.getElementById(id).value = '';
      }
    });
    this._lastDerivedKeys = [];
  },

  /** 在推导的字段上显示黄色标记 */
  markDerived(derivedKeys) {
    this._lastDerivedKeys = derivedKeys || [];
    if (!derivedKeys || derivedKeys.length === 0) return;
    this.motionFields.forEach(({ id, key }) => {
      if (derivedKeys.includes(key)) {
        const el = document.getElementById(id);
        const wrapper = el.closest('.input-wrapper');
        wrapper.classList.add('derived');
        el.classList.add('derived');

        // 添加 "自动" 徽标
        const badge = document.createElement('span');
        badge.className = 'derived-badge';
        badge.textContent = '自动';
        wrapper.appendChild(badge);
      }
    });
  },

  /** 根据电机分类动态填充电机型号下拉框 */
  populateMotorOptions(category) {
    const select = document.getElementById('motorSelect');
    // 清空现有选项
    select.innerHTML = '';

    // 始终保留"自定义"选项
    const customOpt = document.createElement('option');
    customOpt.value = 'custom';
    customOpt.textContent = '自定义（手动输入）';
    select.appendChild(customOpt);

    if (category && category !== 'custom') {
      // 按 key 前缀过滤属于该分类的电机
      Object.entries(Calculator.MOTORS).forEach(([key, motor]) => {
        if (key.startsWith(category) && motor.name) {
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = motor.name;
          select.appendChild(opt);
        }
      });
    }

    select.value = 'custom';
  },

  /** 重置电机参数输入框（清空值、移除样式、恢复可编辑） */
  resetMotorFields() {
    this.motorFieldIds.forEach(id => {
      const el = document.getElementById(id);
      const wrapper = el?.closest('.input-wrapper');
      if (wrapper) wrapper.classList.remove('motor-filled');
      el?.classList.remove('motor-filled');
      if (id !== 'contCurrent' && id !== 'peakCurrent') {
        el?.removeAttribute('readonly');
      }
      el.value = '';
      const badge = el?.parentElement?.querySelector('.motor-badge');
      if (badge) badge.remove();
    });
  },

  /** 电机分类切换处理 */
  onMotorCategoryChange(e) {
    this.populateMotorOptions(e.target.value);
    this.resetMotorFields();
  },

  /** 电机切换处理：自动填充电机参数 */
  onMotorChange(e) {
    const motorId = e.target.value;
    const motor = Calculator.MOTORS[motorId];
    if (!motor) return;

    if (motorId === 'custom') {
      this.resetMotorFields();
      return;
    }

    // 自动填充电机参数
    const fillMap = {
      primaryMass: motor.coilMass,
      forceConstant: motor.Kf,
      contCurrent: motor.Icont,
      peakCurrent: motor.Ipeak,
      magAttraction: motor.Fmag,
    };

    this.motorFieldIds.forEach(id => {
      const el = document.getElementById(id);
      const wrapper = el?.closest('.input-wrapper');
      if (!el || fillMap[id] === null || fillMap[id] === undefined) return;

      // 设置值并标记为电机自动填充
      el.value = fillMap[id];
      el.setAttribute('readonly', true);
      wrapper.classList.add('motor-filled');
      el.classList.add('motor-filled');

      // 添加 "电机" 徽标
      let badge = wrapper.querySelector('.motor-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'motor-badge';
        wrapper.appendChild(badge);
      }
      badge.textContent = '✓';
    });

    // 在力常数上显示额定推力信息
    const kfWrapper = document.getElementById('forceConstant')?.closest('.input-wrapper');
    const fcBadge = kfWrapper?.querySelector('.motor-badge');
    if (fcBadge && motor.Fcont) {
      fcBadge.textContent = `${motor.Fcont}/${motor.Fpeak} N`;
    } else if (fcBadge) {
      fcBadge.textContent = '✓';
    }
  },

  getParams() {
    const g = (id) => parseFloat(document.getElementById(id).value) || 0;
    const raw = (id) => document.getElementById(id).value;
    return {
      stroke: g('stroke'),
      maxVelocity: g('maxVelocity'),
      acceleration: g('acceleration'),
      motionTime: g('motionTime'),
      dwellTime: g('dwellTime'),
      loadMass: g('loadMass'),
      primaryMass: g('primaryMass'),
      frictionCoeff: g('frictionCoeff'),
      inclineAngle: g('inclineAngle'),
      externalForce: g('externalForce'),
      magAttraction: g('magAttraction'),
      forceConstant: g('forceConstant'),
      contCurrent: g('contCurrent'),
      peakCurrent: g('peakCurrent'),
      // 原始值（用于推导判断）
      _raw: {
        S: raw('stroke'),
        Vmax: raw('maxVelocity'),
        a: raw('acceleration'),
        t_run: raw('motionTime'),
      },
    };
  },

  calculate() {
    const raw = this.getParams();

    // 验证必填项
    if (document.getElementById('loadMass').value === '' || raw.loadMass <= 0) {
      alert('请填写负载质量 M');
      document.getElementById('loadMass').focus();
      return;
    }
    if (document.getElementById('frictionCoeff').value === '') {
      alert('请填写摩擦系数 μ');
      document.getElementById('frictionCoeff').focus();
      return;
    }

    // 第1步：推导缺失的运动参数
    const derived = Calculator.deriveMissingParam(raw._raw);
    if (derived.error) {
      alert(derived.error);
      return;
    }

    // 将推导结果写回输入框（保留2位小数）
    this.motionFields.forEach(({ id, key }) => {
      if (derived.derivedKeys.includes(key) && derived[key] !== undefined) {
        document.getElementById(id).value = derived[key].toFixed(2);
      }
    });

    // 标记推导字段
    this.clearDerivedStyles();
    this.markDerived(derived.derivedKeys);

    // 第2步：用完整的参数运行计算
    const params = {
      stroke: derived.S,
      maxVelocity: derived.Vmax,
      acceleration: derived.a,
      dwellTime: raw.dwellTime,
      loadMass: raw.loadMass,
      primaryMass: raw.primaryMass,
      frictionCoeff: raw.frictionCoeff,
      inclineAngle: raw.inclineAngle,
      externalForce: raw.externalForce,
      magAttraction: raw.magAttraction,
      forceConstant: raw.forceConstant,
      contCurrent: raw.contCurrent,
      peakCurrent: raw.peakCurrent,
    };

    const result = Calculator.run(params);

    this.showMotionSummary(result.profile);
    this.showThrustResults(result);
    this.showCheckResults(result);
    this.drawCharts(result.profile, result.forces);

    const panel = document.getElementById('resultPanel');
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },

  showMotionSummary(profile) {
    const el = document.getElementById('motionSummary');
    const { t1, t2, t3, t4, cycleTime, VmaxActual, isTriangle, accel } = profile;
    const t_run = t1 + t2 + t3;

    const items = [
      { label: '加速时间', value: `${t1.toFixed(2)} s` },
      { label: '匀速时间', value: isTriangle ? '— (三角形曲线)' : `${t2.toFixed(2)} s` },
      { label: '减速时间', value: `${t3.toFixed(2)} s` },
      { label: '暂停时间', value: `${t4.toFixed(2)} s` },
      { label: '运动时间 (不含暂停)', value: `${t_run.toFixed(2)} s`, highlight: true },
      { label: '运动周期', value: `${cycleTime.toFixed(2)} s` },
      { label: '加速距离', value: `${profile.S1.toFixed(2)} m` },
      { label: '减速距离', value: `${profile.S3.toFixed(2)} m` },
      { label: '最大速度', value: `${VmaxActual.toFixed(2)} m/s`, yellowBg: true },
      { label: '最大加速度', value: `${accel.toFixed(2)} m/s²`, yellowBg: true },
    ];

    el.innerHTML = items.map(item => `
      <div class="result-item ${item.yellowBg ? 'yellow-bg' : ''}">
        <span class="label">${item.label}</span>
        <span class="value ${item.highlight ? 'highlight' : ''}">${item.value}</span>
      </div>
    `).join('');
  },

  showThrustResults(result) {
    const el = document.getElementById('thrustResults');
    const { Fa, Fc, Fd, frictionForce, gravityForce, normalForce, magAttraction } = result.forces;

    const items = [
      { label: '额定推力', value: `${result.Frms.toFixed(2)} N`, yellowBg: true },
      { label: '峰值推力', value: `${result.Fpeak.toFixed(2)} N`, yellowBg: true },
      { label: '加速推力 Fa', value: `${Fa.toFixed(2)} N`, highlight: true },
      { label: '匀速推力 Fc', value: `${Fc.toFixed(2)} N` },
      { label: '减速推力 Fd', value: `${Fd.toFixed(2)} N` },
      { label: '法向力 N', value: `${normalForce.toFixed(2)} N` },
      { label: '磁吸力 Fmag', value: `${magAttraction.toFixed(2)} N` },
      { label: '摩擦力 μN', value: `${frictionForce.toFixed(2)} N` },
      { label: '重力分量 mg·sinθ', value: `${gravityForce.toFixed(2)} N` },
    ];

    // 仅在配置电机时显示额定推力
    if (result.Fcont > 0 || result.Fpeak_rated > 0) {
      items.push(
        { label: '持续推力额定', value: `${result.Fcont.toFixed(2)} N` },
        { label: '峰值推力额定', value: `${result.Fpeak_rated.toFixed(2)} N` },
      );
    }

    el.innerHTML = items.map(item => `
      <div class="result-item ${item.yellowBg ? 'yellow-bg' : ''}">
        <span class="label">${item.label}</span>
        <span class="value ${item.highlight ? 'highlight' : ''}">${item.value}</span>
      </div>
    `).join('');
  },

  showCheckResults(result) {
    const el = document.getElementById('checkResults');
    const { rmsCheck, peakCheck } = result.checks;

    // 未配置电机 → 仅显示提示
    if (!result._motorConfigured) {
      el.innerHTML = `
        <div class="check-item" style="background:#f1f3f4;border:1px solid #dadce0;">
          <div class="check-header">
            <span class="check-name">电机校核</span>
            <span class="check-badge" style="background:#5f6368;color:white;">未配置</span>
          </div>
          <div class="check-detail">未选择电机，未进行额定推力校核。请选择一款电机或手动输入电机参数。</div>
        </div>`;
      return;
    }

    /**
     * 校核颜色逻辑（基于余量）：
     *   余量 = 额定推力 / 需求推力
     *   ≥ 1.3 → 绿色 (safe, 余量充足)
     *   ≥ 1.0 → 黄色 (warn, 满足但余量不足30%)
     *   < 1.0 → 红色 (danger, 不满足)
     */
    const getRatioClass = (usageRatio) => {
      if (usageRatio <= 0) return 'safe';
      const margin = 1 / usageRatio; // 额定 / 需求
      if (margin >= 1.3) return 'safe';
      if (margin >= 1.0) return 'warn';
      return 'danger';
    };

    /** 根据余量返回外框颜色级别 */
    const getBorderLevel = (usageRatio) => {
      if (usageRatio <= 0) return 'border-safe';
      const margin = 1 / usageRatio;
      if (margin >= 1.3) return 'border-safe';
      if (margin >= 1.0) return 'border-warn';
      return 'border-danger';
    };

    const checks = [
      {
        name: '额定推力校核',
        pass: rmsCheck.pass,
        detail: `RMS 推力 ${result.Frms.toFixed(2)} N ${rmsCheck.pass ? '≤' : '>'} 持续推力额定 ${result.Fcont.toFixed(2)} N`,
        ratio: rmsCheck.ratio,
        margin: rmsCheck.ratio > 0 ? 1 / rmsCheck.ratio : 0,
      },
      {
        name: '峰值推力校核',
        pass: peakCheck.pass,
        detail: `峰值推力 ${result.Fpeak.toFixed(2)} N ${peakCheck.pass ? '≤' : '>'} 峰值推力额定 ${result.Fpeak_rated.toFixed(2)} N`,
        ratio: peakCheck.ratio,
        margin: peakCheck.ratio > 0 ? 1 / peakCheck.ratio : 0,
      },
    ];

    el.innerHTML = checks.map(check => {
      // 计算安全余量百分比
      let marginText = '';
      if (check.ratio > 0) {
        const marginPct = ((check.margin - 1) * 100).toFixed(0);
        marginText = check.margin >= 1
          ? `（安全余量：${marginPct}%）`
          : `（安全余量：不足）`;
      }

      return `
      <div class="check-item ${check.pass ? 'pass' : 'fail'} ${getBorderLevel(check.ratio)}">
        <div class="check-header">
          <span class="check-name">${check.name}</span>
          <span class="check-badge">${check.pass ? '✓ 合格' : '✗ 不合格'}</span>
        </div>
        <div class="check-detail">${check.detail} ${marginText}</div>
        <div class="progress-bar">
          <div class="progress-fill ${getRatioClass(check.ratio)}" style="width: ${Math.min(check.ratio * 100, 100)}%"></div>
        </div>
      </div>`;
    }).join('');
  },

  drawCharts(profile, forces) {
    ChartDrawer.drawSpeedChart('speedChart', profile, forces);
    ChartDrawer.drawThrustChart('thrustChart', profile, forces);
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => UI.init());
