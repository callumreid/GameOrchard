package com.microgamis.app;

import android.content.Context;
import android.content.BroadcastReceiver;
import android.content.Intent;
import android.content.IntentFilter;
import android.media.AudioManager;
import android.os.Handler;
import android.os.Looper;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.JSObject;

@CapacitorPlugin(name = "AudioRouter")
public class AudioRouterPlugin extends Plugin {

    private AudioManager audioManager;
    private Handler mainHandler;
    private BroadcastReceiver scoReceiver;
    private boolean scoDesired = false;

    @Override
    public void load() {
        super.load();
        mainHandler = new Handler(Looper.getMainLooper());
        audioManager = (AudioManager) getContext().getSystemService(Context.AUDIO_SERVICE);
        setupScoReceiver();
    }

    private void setupScoReceiver() {
        scoReceiver = new BroadcastReceiver() {
            @Override
            public void onReceive(Context context, Intent intent) {
                String action = intent.getAction();
                if (AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED.equals(action)) {
                    int state = intent.getIntExtra(AudioManager.EXTRA_SCO_AUDIO_STATE, -1);
                    String stateStr = getScoStateString(state);

                    JSObject logMsg = new JSObject();
                    logMsg.put("msg", "SCO state changed: " + stateStr + " (desired=" + scoDesired + ")");
                    notifyListeners("routerLog", logMsg);

                    // If SCO disconnected but we want it, try to reconnect
                    if (scoDesired && state == AudioManager.SCO_AUDIO_STATE_DISCONNECTED) {
                        mainHandler.postDelayed(() -> {
                            logMsg.put("msg", "Attempting SCO reconnection...");
                            notifyListeners("routerLog", logMsg);
                            audioManager.startBluetoothSco();
                        }, 1000);
                    }
                }
            }
        };

        IntentFilter filter = new IntentFilter(AudioManager.ACTION_SCO_AUDIO_STATE_UPDATED);
        getContext().registerReceiver(scoReceiver, filter);
    }

    private String getScoStateString(int state) {
        switch (state) {
            case AudioManager.SCO_AUDIO_STATE_DISCONNECTED:
                return "DISCONNECTED";
            case AudioManager.SCO_AUDIO_STATE_CONNECTING:
                return "CONNECTING";
            case AudioManager.SCO_AUDIO_STATE_CONNECTED:
                return "CONNECTED";
            case AudioManager.SCO_AUDIO_STATE_ERROR:
                return "ERROR";
            default:
                return "UNKNOWN(" + state + ")";
        }
    }

    @PluginMethod
    public void enableSco(PluginCall call) {
        if (audioManager == null) {
            call.reject("AudioManager not available");
            return;
        }

        scoDesired = true;

        // Log initial state
        logAudioState(audioManager, "BEFORE");

        // Put the device into communication mode so WebRTC uses correct audio path
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);

        // Stop any existing SCO connection first
        audioManager.stopBluetoothSco();
        audioManager.setBluetoothScoOn(false);

        // Wait a moment then start fresh SCO connection
        mainHandler.postDelayed(() -> {
            audioManager.startBluetoothSco();
            audioManager.setBluetoothScoOn(true);

            // Keep trying to maintain SCO connection
            maintainScoConnection();

            // Wait for SCO to establish, then report back
            mainHandler.postDelayed(() -> {
                logAudioState(audioManager, "AFTER");

                JSObject ret = new JSObject();
                ret.put("mode", audioManager.getMode());
                ret.put("scoOn", audioManager.isBluetoothScoOn());
                ret.put("scoAvailable", audioManager.isBluetoothScoAvailableOffCall());
                call.resolve(ret);

                JSObject logMsg = new JSObject();
                logMsg.put("msg", "SCO routing completed");
                notifyListeners("routerLog", logMsg);
            }, 2000); // Wait 2 seconds for SCO to establish
        }, 100); // Wait 100ms after stopping before restarting
    }

    private void maintainScoConnection() {
        mainHandler.postDelayed(() -> {
            if (scoDesired && audioManager != null) {
                if (!audioManager.isBluetoothScoOn()) {
                    JSObject logMsg = new JSObject();
                    logMsg.put("msg", "Maintaining SCO: restarting connection");
                    notifyListeners("routerLog", logMsg);
                    audioManager.startBluetoothSco();
                }
                // Schedule next maintenance check
                maintainScoConnection();
            }
        }, 5000); // Check every 5 seconds
    }

    @PluginMethod
    public void disableSco(PluginCall call) {
        scoDesired = false;
        if (audioManager != null) {
            audioManager.stopBluetoothSco();
            audioManager.setBluetoothScoOn(false);
            audioManager.setMode(AudioManager.MODE_NORMAL);
        }
        call.resolve();
    }

    private void logAudioState(AudioManager am, String prefix) {
        JSObject logMsg = new JSObject();
        String msg = String.format("%s: mode=%d, scoOn=%b, scoAvailable=%b",
                prefix,
                am.getMode(),
                am.isBluetoothScoOn(),
                am.isBluetoothScoAvailableOffCall());
        logMsg.put("msg", msg);
        notifyListeners("routerLog", logMsg);
    }

    @Override
    protected void handleOnDestroy() {
        if (scoReceiver != null) {
            getContext().unregisterReceiver(scoReceiver);
        }
        scoDesired = false;
        super.handleOnDestroy();
    }
}
