package com.maisonmercier.vitalpulse;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/**
 * Widget natif écran d'accueil Android pour VitalPulse v3.0.
 * Affiche un résumé rapide (jeûne, calories, pas) si synchronisé dans les préférences
 * partagées locales et ouvre directement l'application au toucher.
 */
public class VitalPulseWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "VitalPulseWidgetPrefs";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(
        Context context,
        AppWidgetManager appWidgetManager,
        int appWidgetId
    ) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String badge = prefs.getString("badge", "COCKPIT SANTÉ");
        String primary = prefs.getString("primary", "Jeûne • Calories • Pas");
        String secondary = prefs.getString(
            "secondary",
            "Touchez pour ouvrir le timer de jeûne, le scan assiette et votre bilan."
        );

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.vitalpulse_widget);
        views.setTextViewText(R.id.vp_widget_badge, badge);
        views.setTextViewText(R.id.vp_widget_primary, primary);
        views.setTextViewText(R.id.vp_widget_secondary, secondary);

        Intent launchIntent = new Intent(context, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            context,
            appWidgetId,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.vp_widget_root, pendingIntent);

        appWidgetManager.updateAppWidget(appWidgetId, views);
    }
}
