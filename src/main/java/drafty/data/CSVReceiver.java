package drafty.data;


import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileOutputStream;
import java.io.FileReader;
import java.io.IOException;
import java.io.OutputStream;

import com.vaadin.ui.Upload.Receiver;
import com.vaadin.ui.Upload.SucceededEvent;
import com.vaadin.ui.Upload.SucceededListener;

public class CSVReceiver implements Receiver, SucceededListener {
	
	/**
	 * 
	 */
	private static final long serialVersionUID = -190765906348141352L;
	
	protected File temp;
	
	@Override
	public OutputStream receiveUpload(String filename, String mimType){
		try {
			System.out.println("Recieve Upload - filename = " + filename);
			System.out.println("Recieve Upload - mimType = " + mimType);
			//temp = File.createTempFile("temp", ".csv");
			temp = new File("temp");
			return new FileOutputStream(temp);
		}
		catch (IOException e){
			System.out.println("Error uploading file");
			return null;
		}
	}
	
	public void uploadSucceeded(SucceededEvent event) {
		//TO-DO
		try {
			FileReader reader = new FileReader(temp);
			DataImporter importer = new DataImporter();
			try {
				importer.readCSVSuggestion(temp);
			} catch (Exception e) {
				System.out.println("Error Exception - uploadSucceeded(SucceededEvent event) - importer.readCSVSuggestion(temp): " + e);
			}
			try {
				reader.close();
			} catch (IOException e) {
				System.out.println("Error IOException - uploadSucceeded(SucceededEvent event) - reader.close(): " + e);
			}
			temp.delete();
		} catch (FileNotFoundException e) {
			System.out.println("Error FileNotFoundException - uploadSucceeded(SucceededEvent event): " + e);
		}
		
	}
}