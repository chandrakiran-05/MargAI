package com.margai.driver.auto

import androidx.car.app.CarContext
import androidx.car.app.Screen
import androidx.car.app.model.*
import androidx.car.app.navigation.model.NavigationTemplate

/**
 * Android Auto In-Cabin Navigation Screen
 * Displays road hazard alerts and corridor route guidance on vehicle dash.
 */
class MargAINavigationScreen(carContext: CarContext) : Screen(carContext) {

    private var currentHazardAlert: String? = "ORR Southbound: 2 Corroborated Hazards Ahead"

    override fun onGetTemplate(): Template {
        val actionStrip = ActionStrip.Builder()
            .addAction(
                Action.Builder()
                    .setTitle("Report")
                    .setOnClickListener {
                        // Ingest driver road bump observation
                    }
                    .build()
            )
            .build()

        val pane = Pane.Builder()
            .addRow(
                Row.Builder()
                    .setTitle("MargAI Road Intelligence")
                    .addText(currentHazardAlert ?: "Corridor Normal")
                    .build()
            )
            .build()

        return PaneTemplate.Builder(pane)
            .setHeaderAction(Action.APP_ICON)
            .setActionStrip(actionStrip)
            .setTitle("MargAI Automotive")
            .build()
    }
}
