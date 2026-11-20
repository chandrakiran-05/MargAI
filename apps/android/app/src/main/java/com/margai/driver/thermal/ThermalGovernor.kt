package com.margai.driver.thermal

import android.content.Context
import android.os.Build
import android.os.PowerManager
import androidx.annotation.RequiresApi
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow

enum class ThermalLevel {
    NORMAL,      // Full capture FPS (30 FPS), all models active
    WARM,        // Throttle to 15 FPS, reduce resolution
    HOT,         // Throttle to 8 FPS, disable optional dehazing
    CRITICAL,    // Suspend camera inference, keep WebSocket alerts active
    RECOVERING   // Hysteresis recovery
}

/**
 * Thermal Governor leveraging Google ADPF (Android Dynamic Performance Framework)
 * and PowerManager.OnThermalStatusChangedListener (Android 10+ / API 29+)
 */
class ThermalGovernor(context: Context) {
    private val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
    private val _thermalState = MutableStateFlow(ThermalLevel.NORMAL)
    val thermalState: StateFlow<ThermalLevel> = _thermalState

    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && powerManager != null) {
            registerThermalListener(powerManager)
        }
    }

    @RequiresApi(Build.VERSION_CODES.Q)
    private fun registerThermalListener(pm: PowerManager) {
        pm.addThermalStatusListener { status ->
            val mappedLevel = when (status) {
                PowerManager.THERMAL_STATUS_NONE,
                PowerManager.THERMAL_STATUS_LIGHT -> ThermalLevel.NORMAL
                PowerManager.THERMAL_STATUS_MODERATE -> ThermalLevel.WARM
                PowerManager.THERMAL_STATUS_SEVERE -> ThermalLevel.HOT
                PowerManager.THERMAL_STATUS_CRITICAL,
                PowerManager.THERMAL_STATUS_EMERGENCY,
                PowerManager.THERMAL_STATUS_SHUTDOWN -> ThermalLevel.CRITICAL
                else -> ThermalLevel.NORMAL
            }
            _thermalState.value = mappedLevel
        }
    }

    fun getRecommendedFps(): Int {
        return when (_thermalState.value) {
            ThermalLevel.NORMAL -> 30
            ThermalLevel.WARM -> 15
            ThermalLevel.HOT -> 8
            ThermalLevel.CRITICAL -> 0 // Suspend capture
            ThermalLevel.RECOVERING -> 15
        }
    }
}
