(function (host) {
    'use strict';
    const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
    const unit = vector => {
        const length = Math.hypot(...vector);
        if (!Number.isFinite(length) || length < 1e-9) throw new Error('A valid showcase direction is required.');
        return vector.map(value => value / length);
    };
    function pose(frame, camera, yawDegrees = 0, tiltDegrees = 18, distanceScale = 1) {
        const normal = unit(frame.normal);
        const rawUp = frame.up || camera.up;
        const alongNormal = dot(rawUp, normal);
        const up = unit(rawUp.map((value, i) => value - alongNormal * normal[i]));
        const right = [up[1]*normal[2]-up[2]*normal[1], up[2]*normal[0]-up[0]*normal[2], up[0]*normal[1]-up[1]*normal[0]];
        const yaw = yawDegrees * Math.PI / 180, tilt = tiltDegrees * Math.PI / 180;
        const distance = Math.hypot(...camera.position.map((value, i) => value - camera.target[i])) * distanceScale;
        if (![yaw, tilt, distance].every(Number.isFinite) || distance <= 0) throw new Error('Invalid showcase camera.');
        const direction = normal.map((value, i) => Math.cos(tilt) * (value * Math.cos(yaw) + right[i] * Math.sin(yaw)) + up[i] * Math.sin(tilt));
        return {position: camera.target.map((value, i) => value + direction[i] * distance), target: [...camera.target], up};
    }
    const api = {pose};
    if (typeof module === 'object' && module.exports) module.exports = api;
    else host.IRCAProductCamera = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
