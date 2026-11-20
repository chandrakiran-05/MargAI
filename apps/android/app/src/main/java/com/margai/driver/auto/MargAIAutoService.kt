package com.margai.driver.auto

import androidx.car.app.CarAppService
import androidx.car.app.Screen
import androidx.car.app.Session
import androidx.car.app.validation.HostValidator

/**
 * Android Auto CarAppService integration for MargAI
 * Connects directly to vehicle infotainment head units via Android Auto.
 */
class MargAIAutoService : CarAppService() {
    override fun createHostValidator(): HostValidator {
        return HostValidator.ALLOW_ALL_HOSTS_VALIDATOR
    }

    override fun onCreateSession(): Session {
        return object : Session() {
            override fun onCreateScreen(intent: android.content.Intent): Screen {
                return MargAINavigationScreen(carContext)
            }
        }
    }
}
