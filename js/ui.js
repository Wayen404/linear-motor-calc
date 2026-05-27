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

  /** 当前选中的电机（null = 未选择） */
  _selectedMotor: null,

  /** 上一次推导的字段 key 列表 */
  _lastDerivedKeys: [],

  /** 上一次推导时的 S 和 t_run（用于判断用户是否改了它们） */
  _lastS: undefined,
  _lastT_run: undefined,

  /** 用户最后修改的运动参数字段 */
  _lastChangedField: null,

  init() {
    document.getElementById('calcBtn').addEventListener('click', () => this.calculate());
    document.querySelectorAll('.param-input').forEach(el => {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.calculate();
      });
      el.addEventListener('focus', () => {
        if (el.classList.contains('motion-param')) this.clearDerivedStyles();
      });
      el.addEventListener('input', () => {
        if (el.classList.contains('motion-param')) {
          this.clearDerivedStyles();
          const field = this.motionFields.find(f => f.id === el.id);
          if (field) this._lastChangedField = field.key;
        }
      });
    });

    // 分类切换时清除已选电机
    document.getElementById('motorCategory').addEventListener('change', () => {
      this._selectedMotor = null;
    });

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

        const badge = document.createElement('span');
        badge.className = 'derived-badge';
        badge.textContent = '自动';
        wrapper.appendChild(badge);
      }
    });
  },

  calculate() {
    // 读取所有输入值（直接从 DOM）
    const read = (id) => document.getElementById(id).value;
    const g = (id) => parseFloat(read(id)) || 0;

    // 验证必填项
    if (read('loadMass') === '' || g('loadMass') <= 0) {
      alert('请填写负载质量 M');
      document.getElementById('loadMass').focus();
      return;
    }
    if (read('frictionCoeff') === '') {
      alert('请填写摩擦系数 μ');
      document.getElementById('frictionCoeff').focus();
      return;
    }

    // 第1步：构建推导输入，清除旧推导值
    const rawInput = {
      S: read('stroke'), Vmax: read('maxVelocity'),
      a: read('acceleration'), t_run: read('motionTime'),
    };

    if (this._lastDerivedKeys.length > 0) {
      const curS = g('stroke');
      const curT = g('motionTime');
      const sChanged = this._lastS !== undefined && Math.abs(curS - this._lastS) > 0.0001;
      const tChanged = this._lastT_run !== undefined && Math.abs(curT - this._lastT_run) > 0.0001;

      if (sChanged || tChanged) {
        if (this._lastDerivedKeys.includes('Vmax')) rawInput.Vmax = '';
        if (this._lastDerivedKeys.includes('a')) rawInput.a = '';
      } else {
        const changed = this._lastChangedField;
        if (changed === 'Vmax' && this._lastDerivedKeys.includes('a')) rawInput.a = '';
        else if (changed === 'a' && this._lastDerivedKeys.includes('Vmax')) rawInput.Vmax = '';
      }
    }
    this._lastChangedField = null;
      }
    }

    const derived = Calculator.deriveMissingParam(rawInput);
    if (derived.error) {
      alert(derived.error);
      return;
    }

    // 将推导值写入 DOM（如有）
    this.motionFields.forEach(({ id, key }) => {
      if (derived.derivedKeys.includes(key) && derived[key] !== undefined) {
        document.getElementById(id).value = derived[key].toFixed(2);
      }
    });
    this.clearDerivedStyles();
    this.markDerived(derived.derivedKeys);
    this._lastS = g('stroke');
    this._lastT_run = g('motionTime');

    // 第2步：自动选择最佳电机
    const tDwell = g('dwellTime');
    const profile = Calculator.calcMotionProfile(derived.S, derived.Vmax, derived.a, tDwell);
    const matched = Calculator.autoMatchMotors(profile, {
      loadMass: g('loadMass'),
      frictionCoeff: g('frictionCoeff'),
      inclineAngle: g('inclineAngle'),
      externalForce: g('externalForce'),
    }, document.getElementById('motorCategory').value === 'all' ? null : document.getElementById('motorCategory').value);
    this._selectedMotor = null;
    const best = matched.safe.length > 0 ? matched.safe[0]
               : matched.warn.length > 0 ? matched.warn[0]
               : null;
    const motor = best ? Calculator.MOTORS[best.key] : null;
    if (motor) this._selectedMotor = motor;

    // 第3步：执行完整计算
    const totalMass = g('loadMass') + (motor ? motor.coilMass : 0);
    const forces = Calculator.calcThrustForces(
      totalMass, derived.a,
      g('frictionCoeff'), g('inclineAngle'),
      motor ? motor.Fmag : 0
    );
    const _extF = g('externalForce');
    const Frms = Calculator.calcRMSThrust(forces, profile.t1, profile.t2, profile.t3, profile.t4) + _extF;
    const Fpeak = Calculator.calcPeakThrust(forces) + _extF;
    const Fcont = motor ? (motor.Fcont || motor.Kf * motor.Icont) : 0;
    const Fpeak_rated = motor ? (motor.Fpeak || motor.Kf * motor.Ipeak) : 0;
    const _motorConfigured = !!motor;

    const result = {
      profile,
      forces,
      Frms,
      Fpeak,
      Fcont,
      Fpeak_rated,
      _motorConfigured,
      checks: Calculator.checkRatings(Frms, Fpeak, Fcont, Fpeak_rated),
    };

    this.showAutoMatch(result.profile, {
      loadMass: g('loadMass'),
      frictionCoeff: g('frictionCoeff'),
      inclineAngle: g('inclineAngle'),
      externalForce: g('externalForce'),
    });
    this.showMotionSummary(result.profile);
    this.showThrustResults(result);
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
    const section = document.getElementById('checkResults').parentElement;
    section.style.display = 'block';
    const el = document.getElementById('checkResults');
    const { rmsCheck, peakCheck } = result.checks;

    if (!result._motorConfigured) {
      el.innerHTML = `
        <div class="check-item" style="background:#f1f3f4;border:1px solid #dadce0;">
          <div class="check-header">
            <span class="check-name">电机校核</span>
            <span class="check-badge" style="background:#5f6368;color:white;">未配置</span>
          </div>
          <div class="check-detail">未选择电机，未进行额定推力校核。</div>
        </div>`;
      return;
    }

    const getRatioClass = (usageRatio) => {
      if (usageRatio <= 0) return 'safe';
      const margin = 1 / usageRatio;
      if (margin >= 1.3) return 'safe';
      if (margin >= 1.0) return 'warn';
      return 'danger';
    };

    const getLevelClass = (usageRatio) => {
      if (usageRatio <= 0) return 'level-green';
      const margin = 1 / usageRatio;
      if (margin >= 1.3) return 'level-green';
      if (margin >= 1.0) return 'level-yellow';
      return 'level-red';
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
      let marginText = '';
      if (check.ratio > 0) {
        const marginPct = ((check.margin - 1) * 100).toFixed(0);
        marginText = check.margin >= 1
          ? `（安全余量：${marginPct}%）`
          : `（安全余量：不足）`;
      }

      return `
      <div class="check-item ${getLevelClass(check.ratio)}">
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

  /** 显示自动匹配推荐（每款电机独立计算，含自身质量与磁吸力） */
  showAutoMatch(profile, load) {
    const section = document.getElementById('autoMatchSection');
    const el = document.getElementById('matchResults');

    // 按分类筛选
    const category = document.getElementById('motorCategory').value;
    const catFilter = category !== 'all' ? category : null;
    const matched = Calculator.autoMatchMotors(profile, load, catFilter);

    if (!matched.safe.length && !matched.warn.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';

    let html = '';

    // Tier 1: 余量充足 ≥30%
    if (matched.safe.length > 0) {
      html += '<div style="margin-bottom:6px;font-size:0.82rem;color:var(--text-secondary);padding:2px 2px;">● 余量充足（推荐）</div>';
      matched.safe.forEach((m, i) => {
        html += this._buildMatchCard(m, i === 0);
      });
    }

    // Tier 2: 满足但余量不足 30%
    if (matched.warn.length > 0) {
      html += `<div style="margin-top:${matched.safe.length > 0 ? '10' : '0'}px;margin-bottom:6px;font-size:0.82rem;color:var(--text-secondary);padding:2px 2px;">● 满足但余量不足 30%</div>`;
      matched.warn.forEach(m => {
        html += this._buildMatchCard(m);
      });
    }

    el.innerHTML = html;
  },

  /** 构建单条匹配卡片 HTML */
  _buildMatchCard(m, isBest) {
    const rmsPct = m.rmsMargin >= 1 ? ((m.rmsMargin - 1) * 100).toFixed(0) : '不足';
    const peakPct = m.peakMargin >= 1 ? ((m.peakMargin - 1) * 100).toFixed(0) : '不足';
    const rmsCls = m.rmsMargin >= 1.3 ? 'safe' : m.rmsMargin >= 1 ? 'warn' : 'danger';
    const peakCls = m.peakMargin >= 1.3 ? 'safe' : m.peakMargin >= 1 ? 'warn' : 'danger';

    return `
      <div class="match-item${isBest ? ' match-item-best' : ''}" data-motor-key="${m.key}">
        <div class="match-info">
          <div class="match-name">${m.name}${isBest ? ' <span class="best-badge">最佳推力匹配</span>' : ''}</div>
          <div class="match-detail">
            需求 ${m.Frms.toFixed(1)}/${m.Fpeak.toFixed(1)} N · 额定 ${m.Fcont}/${m.Fpeak_rated} N · 动子 ${m.coilMass} kg
          </div>
        </div>
        <div class="match-badges">
          <span class="match-badge match-badge-${rmsCls}">额定 ${rmsPct}%</span>
          <span class="match-badge match-badge-${peakCls}">峰值 ${peakPct}%</span>
        </div>
      </div>`;
  },

  drawCharts(profile, forces) {
    ChartDrawer.drawSpeedChart('speedChart', profile, forces);
    ChartDrawer.drawThrustChart('thrustChart', profile, forces);
  },
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => UI.init());
