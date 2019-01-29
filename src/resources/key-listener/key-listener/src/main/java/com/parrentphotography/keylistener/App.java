package com.parrentphotography.keylistener;

import java.util.Map.Entry;

import lc.kra.system.keyboard.GlobalKeyboardHook;
import lc.kra.system.keyboard.event.GlobalKeyAdapter;
import lc.kra.system.keyboard.event.GlobalKeyEvent;
public final class App {


    public int code = 0;
    private static boolean run = true;

    private App() {
        // setFocusable(true);
        // this.addKeyListener(this);
        // System.out.println("Hello World!");
    }

    public void init() {
        
        /*
        this.addKeyListener(this);
        System.out.println("Hello World!");
        while (this.code == 0) {
        }
        System.out.println(this.code);
        */
        
    }
    
    /**
    * Says hello to the world.
    * 
    * @param args The arguments of the program.
    */
    public static void main(String[] args) throws InterruptedException {
        // might throw a UnsatisfiedLinkError if the native library fails to load or a
        // RuntimeException if hooking fails
        GlobalKeyboardHook keyboardHook = new GlobalKeyboardHook(true); // use false here to switch to hook instead of
                                                                        // raw input
        /*
        System.out.println(
                "Global keyboard hook successfully started, press [escape] key to shutdown. Connected keyboards:");
        for (Entry<Long, String> keyboard : GlobalKeyboardHook.listKeyboards().entrySet())
            System.out.format("%d: %s\n", keyboard.getKey(), keyboard.getValue());
        */

        keyboardHook.addKeyListener(new GlobalKeyAdapter() {
            @Override
            public void keyPressed(GlobalKeyEvent event) {
                if (event.getVirtualKeyCode() == GlobalKeyEvent.VK_SHIFT)
                    System.out.print(0);
                if (event.getVirtualKeyCode() == GlobalKeyEvent.VK_CONTROL)
                    System.out.print(1);
                /*
                if (event.getVirtualKeyCode() == GlobalKeyEvent.VK_ESCAPE)
                    run = false;
                    */
            }

            @Override
            public void keyReleased(GlobalKeyEvent event) {
                if (event.getVirtualKeyCode() == GlobalKeyEvent.VK_SHIFT)
                    System.out.print(2);
                if (event.getVirtualKeyCode() == GlobalKeyEvent.VK_CONTROL)
                    System.out.print(3);
                // System.out.println(event);
            }
        });

        try {
            while (run)
                Thread.sleep(128);
        } catch (InterruptedException e) {
            /* nothing to do here */ } finally {
            keyboardHook.shutdownHook();
        }
    }
}
