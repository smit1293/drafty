package drafty.components;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.naming.Context;
import javax.naming.InitialContext;
import javax.sql.DataSource;

import com.vaadin.data.validator.StringLengthValidator;
import com.vaadin.event.FieldEvents.BlurEvent;
import com.vaadin.event.FieldEvents.BlurListener;
import com.vaadin.event.FieldEvents.TextChangeEvent;
import com.vaadin.event.FieldEvents.TextChangeListener;
import com.vaadin.server.FontAwesome;
import com.vaadin.shared.ui.combobox.FilteringMode;
import com.vaadin.shared.ui.label.ContentMode;
import com.vaadin.ui.Alignment;
import com.vaadin.ui.Button;
import com.vaadin.ui.ComboBox;
import com.vaadin.ui.Label;
import com.vaadin.ui.Notification;
import com.vaadin.ui.OptionGroup;
import com.vaadin.ui.TextField;
import com.vaadin.ui.UI;
import com.vaadin.ui.VerticalLayout;
import com.vaadin.ui.Window;
import com.vaadin.ui.Window.CloseEvent;

import drafty._MainUI;
import drafty.models.Mode;

public class SuggestionComponent extends Window {

	private static final long serialVersionUID = -4092675275245757132L;

	String DATASOURCE_CONTEXT = _MainUI.getApi().getJNDI();
	
	// Create a sub-window and add it to the main window
	final Window sub = new Window(" Suggestion");
	VerticalLayout suggestionModal = new VerticalLayout();

	private String person_id = _MainUI.getApi().getCellSelection().getPerson_id();
	private String origSuggestion = _MainUI.getApi().getCellSelection().getOrigSuggestion();
	private String idSuggestion = _MainUI.getApi().getCellSelection().getOrigSuggestionId();
	private String person_name = _MainUI.getApi().getCellSelection().getPerson_name();
	private String person_university = _MainUI.getApi().getCellSelection().getPerson_university();
	private String suggestionType  = _MainUI.getApi().getCellSelection().getOrigSuggestionTypeId();
	private String prof_university = _MainUI.getApi().getCellSelection().getPerson_university();
	
	private static String blank_cell_text = "Not Applicable (blank cell)";
	
	/*
	 * Mode types:
	 * normal - a user double clicked
	 * exp1_no_interest
	 * exp1_user_interest
	 */
	private String suggestionMode;
	
	private String newMaxConf;
	
	private Map<String,String> suggestionsMap = new HashMap<String,String>();
	private Map<String,String> suggestionsMap_temp = new HashMap<String,String>();
	private String idNewSuggestion;
	private String idValidation;
	
	//ui ctrls for person select - validations
	Label label_suggestions = new Label();
	Label label_hr = new Label("<hr />", ContentMode.HTML);
	Label label_footer = new Label("", ContentMode.HTML);
	OptionGroup suggestions_optiongroup = new OptionGroup();
	TextField suggestion_textbox = new TextField();
	Button submitSuggestion_button = new Button("Submit Suggestion");
	Button closeExperiment_button = new Button("I do not want to help");
	private ComboBox universities = new ComboBox();
	private ComboBox subfields = new ComboBox();
	
	private String newSuggestion;
	private String chosenSug;
	
	private String new_sugg_text = "Select or enter new value below:";
	private String new_sugg_text_url_or_year = "";
	
	public SuggestionComponent(String suggestionMode) {
		this.suggestionMode = suggestionMode;
		sub.setImmediate(true);
		sub.addCloseListener(e -> closeListener(e));
		
		sub.setWidth("640px");
		sub.setResizable(false);
		sub.setIcon(FontAwesome.PENCIL_SQUARE_O);
		_MainUI.getApi().getActiveMode().setActiveMode(Mode.SUGGESTION);
		
		System.out.println("NEW SUGG: profile id = " + _MainUI.getApi().getProfile().getIdProfile() + ", mode = " + suggestionMode + ", expId = " + _MainUI.getApi().getProfile().getIdExperiment());
		
		if (suggestionMode.equals("experiment")) {
			sub.setWidth("640px");
			sub.setCaption("");
			sub.setIcon(FontAwesome.AMBULANCE);
			_MainUI.getApi().getActiveMode().setActiveMode(Mode.EXPERIMENT);
		}
		
		//create new validation entry
		newValidation();
		
		//UI creation
		addValidators();
		addListeners();
		createUI();
		
		UI.getCurrent().addWindow(sub);
		UI.getCurrent().setFocusedComponent(sub);
	}


	private void closeListener(CloseEvent e) {
		//System.out.println("CLOSE EVENT");
		_MainUI.getApi().getActiveMode().setActiveMode(Mode.NORMAL);
		_MainUI.getApi().setInteractionCount(0);
		_MainUI.getApi().setInteractionScore(0);
		
		_MainUI.getApi().resetIntAsk(7, 13); //7-13 random interactions
	}

	private void createUI() {
		suggestionModal.setMargin(true);
		suggestionModal.setSpacing(true);
		
		suggestions_optiongroup = new OptionGroup();
	    suggestions_optiongroup.setWidth("100%");
	    suggestions_optiongroup.setMultiSelect(false);
	    suggestions_optiongroup.addValueChangeListener(e -> submitSuggestion_button.setEnabled(true));
	    
	    List<String> suggestions_list = new ArrayList<String>();
	    try {
	    	suggestions_list = getSuggestions();
	    	
	    	//if there are no suggestions add Not Applicable (blank cell)
	    	for (int i = 0; i < suggestions_list.size(); i++) {
				if (suggestions_list.get(i).isEmpty()) {
					suggestions_list.set(i, blank_cell_text);
				}
			}
		} catch (SQLException e) {
			System.out.println("getSuggestions() SQL error " + e);
		}
	    
	    //Create radio buttons based upon column type, if not gender or rank then use list_validations
	    if (suggestionType.equals("Gender")) {
	    	suggestions_optiongroup.addItem("Male");
	    	suggestions_optiongroup.addItem("Female");
	    	//suggestions_optiongroup.addItem("Other");
	    	submitSuggestion_button.setEnabled(true);
	    } else if (suggestionType.equals("Rank")) {
	    	suggestions_optiongroup.addItem("Full");
	    	suggestions_optiongroup.addItem("Associate");
	    	suggestions_optiongroup.addItem("Assistant");
	    	submitSuggestion_button.setEnabled(true);
	    } else {
    		//get suggestions for option group
			suggestions_optiongroup.addItems(suggestions_list);
			
			if(suggestionType.equals("PhotoUrl") || suggestionType.equals("Sources") || suggestionType.equals("JoinYear")) {
				suggestions_optiongroup.addItem(new_sugg_text_url_or_year);	
			} else {
				suggestions_optiongroup.addItem(new_sugg_text);	
			}
	    }
	    
	    //ask correct question based on suggestionType
	    if(suggestionMode.equals("experiment")) {
	    	//String for_label_sugg = "<p style=\"margin-top: 0px; line-height: 25px;\">" + "<b>Thank you</b>, please help contribute data to improve this public information.</p>";
	    	
	    	String for_label_sugg = "<h2 style=\"display: block; text-align: center; margin-top: 0px;\">Thank you for using Drafty</h2> "
	    							+ "<span style=\"display: block; text-align: center;\">Can you please help us find missing data to improve this public information?</span>";
	    	
	    	for_label_sugg += "<hr><i><span style=\"color: rgb(153, 153, 153); display: block; text-align: center;\">"
	    			+ "For reference, Drafty's data suggests " + person_name + " is currently a professor at: <br><i>" + person_university + "</i></span><hr>";
	    	
	    	if (suggestionType.equals("University")) {
	    		for_label_sugg += "<h3><b>At what <b>university</b> is <b>" + person_name + "</b> a professor at?</h3> ";
	    	} else if (suggestionType.equals("Bachelors") || suggestionType.equals("Masters") || suggestionType.equals("Doctorate") || suggestionType.equals("PostDoc")) {
	    		for_label_sugg += "<h3><b>At what university did <b>" + person_name + "</b> receive their <b>" + suggestionType + "</b>?</h3> ";
	    	} else if(suggestionType.equals("JoinYear")) {
	    		for_label_sugg += "<h3><b>What <b>year</b> did <b>" + person_name + "</b> join their current university?</h3> ";
	    	} else {
	    		for_label_sugg += "<h3><b>What is <b>" + person_name + "'s " + suggestionType + "</b>?</h3> ";
	    	}
	    	//for_label_sugg += "Drafty's data suggests they are currently a professor at: <br><i>" + person_university + "</i><hr>";
	    	
	    	label_suggestions = new Label(for_label_sugg, ContentMode.HTML);
	    } else {
	    	label_suggestions = new Label("<h3 style=\"margin-top: 0px; line-height: 25px;\">Make a suggestion for <b>"  + person_name + "'s <i>" + suggestionType + "</i></b>:</h3>", ContentMode.HTML);	
	    }
	    
	    label_suggestions.addStyleName("padding-top-none");
	    submitSuggestion_button.setIcon(FontAwesome.FLOPPY_O);
	    submitSuggestion_button.setWidth("100%");
	    submitSuggestion_button.setEnabled(false);
    	submitSuggestion_button.setCaption("Submit Suggestion for " + suggestionType);
    	
		submitSuggestion_button.addClickListener(e -> submitSuggestion());
	    
	    suggestionModal.addComponents(label_suggestions, suggestions_optiongroup);
	    
	    if (suggestionType.equals("Subfield")) {
	    	List<String> fieldlist = _MainUI.getApi().getSubfields();
	    	subfields.addItems(fieldlist);
	    	suggestionModal.addComponent(subfields);
	    	subfields.setFilteringMode(FilteringMode.CONTAINS);
	    	subfields.setWidth("100%");
	    	String width = Float.toString(sub.getWidth() - 50.0f);
	    	subfields.setWidth(width);
	    	subfields.setPageLength(fieldlist.size());
	    	subfields.setStyleName("option-group-margin-left");
	    }
	    
	    if (suggestionType.equals("University") || suggestionType.equals("Bachelors") || suggestionType.equals("Masters") || suggestionType.equals("Doctorate") || suggestionType.equals("PostDoc")) {
	    	List<String> unis;
	    	universities.setFilteringMode(FilteringMode.CONTAINS);
	    	if (suggestionType.equals("University")) {
	    		unis = _MainUI.getApi().getUniversitiesUSACan();
		    	universities.addItems(unis);
			    universities.setInputPrompt("Select a new university");
	    	} else {
	    		unis = _MainUI.getApi().getUniversities();
		    	universities.addItems(unis);	
			    universities.setInputPrompt("Select or enter a new university");
	    	}
	    	suggestionModal.addComponent(universities);
	    	universities.setWidth("100%");
	    	String width = Float.toString(sub.getWidth() - 50.0f);
	    	universities.setWidth(width);
	    	universities.setPageLength(unis.size());
	    	universities.setStyleName("option-group-margin-left");
	    }
	  
	    
	    if(suggestionType.equals("JoinYear") || suggestionType.equals("Sources") || suggestionType.equals("PhotoUrl")) {
	    	suggestionModal.addComponent(suggestion_textbox);
	    	suggestion_textbox.setStyleName("text-field-margin-left");
	    	suggestion_textbox.addStyleName("margin-top-negative");
	    	suggestion_textbox.setWidth("100%"); 
	    	String width = Float.toString(sub.getWidth() - 50.0f);
	    	suggestion_textbox.setWidth(width);
	    	if(suggestionType.equals("JoinYear")) {
	    		suggestion_textbox.setWidth("180px"); 
	    	}
	    }
	    
	    suggestionModal.addComponents(label_hr, submitSuggestion_button);
	    suggestionModal.setComponentAlignment(submitSuggestion_button, Alignment.MIDDLE_RIGHT);
	    
	    if(suggestionMode.equals("experiment")) {
	    	suggestionModal.addComponent(closeExperiment_button);
	    	suggestionModal.setComponentAlignment(closeExperiment_button, Alignment.MIDDLE_RIGHT);
	    	closeExperiment_button.setWidth("100%");
	    	closeExperiment_button.setIcon(FontAwesome.CLOSE);
	    	closeExperiment_button.addStyleName("button-gray");
	    	closeExperiment_button.addClickListener(e -> sub.close());
	    	sub.removeAllCloseShortcuts();
	    	sub.setClosable(false);
	    }
	    
	    
	    String footer_text = "<hr><span style=\"color: rgb(153, 153, 153); display: block; text-align: center;\">*This information is usually found on their homepage, bio, or department directory.</span>";
	    label_footer = new Label(footer_text, ContentMode.HTML);
	    suggestionModal.addComponent(label_footer);
	    label_footer.setWidth("100%");
	    
	    //Final UI Adjustments for University and Subfield
	    subfields.addStyleName("margin-top-negative");
	    subfields.setInputPrompt("Select new subfield");
	    subfields.setFilteringMode(FilteringMode.CONTAINS);
	    universities.addStyleName("margin-top-negative");
	    universities.setFilteringMode(FilteringMode.CONTAINS);
	    
		sub.setContent(suggestionModal);
		sub.setModal(true);
	}

	public void submitSuggestion() {
		int flag = 0;
		String selected = suggestions_optiongroup.getValue().toString();
		newSuggestion = selected;
		boolean createNewSuggCheck = false;
		
		if(!suggestions_optiongroup.isEmpty()) {
			if(selected.equals(new_sugg_text) || selected.equals(new_sugg_text_url_or_year)) {
				
				if (suggestionType.equals("Subfield")) {
					if (!subfields.isEmpty()) {
						newSuggestion = subfields.getValue().toString();
						flag = 1;
					}
			    }
			    
				if (suggestionType.equals("University") || suggestionType.equals("Bachelors") || suggestionType.equals("Masters") 
						|| suggestionType.equals("Doctorate") || suggestionType.equals("PostDoc")) {
			    	
					if (!universities.isEmpty()) {
						newSuggestion = universities.getValue().toString();
						flag = 1;
					}
			    }
			    
			    //pulls from text field suggestion box
			    if (flag == 0) {
			    	newSuggestion = suggestion_textbox.getValue().toString();
			    }
			    
			    //NEW SUGGESTION!..possibly
			    createNewSuggCheck = checkNewSuggestion(); //need to run again bc newSuggestion has changed
			    if(createNewSuggCheck) {
			    	newSuggestion();	
			    }
			} else if(selected.equals(blank_cell_text)) {
				newSuggestion = "";
                createNewSuggCheck = checkNewSuggestion();
                if(createNewSuggCheck) {
                    newSuggestion();    
                } else {
                    updateSuggestionConf();
                }
            } else if(suggestionType.equals("Rank") || suggestionType.equals("Gender")) {
				//NEW SUGGESTION!..possibly
				createNewSuggCheck = checkNewSuggestion();
			    if(createNewSuggCheck) {
			    	newSuggestion();	
			    } else {
			    	newSuggestion = suggestions_optiongroup.getValue().toString();
					updateSuggestionConf();
			    }
			} else {
				checkNewSuggestion();
				updateSuggestionConf();
			}
			
			flag = 0;
			//loop through proposed suggestions to write to Validation_Suggestion table w/ new Validation ID
			for (Map.Entry<String, String> map : suggestionsMap.entrySet()) {
				
				if (map.getValue().equals(selected)) {
					chosenSug = "1";
					flag = 1;
				} else if (map.getValue().trim().isEmpty() && selected.equals(blank_cell_text)) {
					chosenSug = "1";
					flag = 1;
				} else {
					chosenSug = "0";
				}
				
				//System.out.println("newValidationSuggestion idSuggestion -> " + map.getKey());
				newValidationSuggestion(map.getKey(), "0", chosenSug); //map.getKey() = idSuggestion
			} 
			
			if ((selected.equals(new_sugg_text) || selected.equals(new_sugg_text_url_or_year)) && flag == 0) {
				newValidationSuggestion(idNewSuggestion, "1", "1");
			} else if(selected.equals(new_sugg_text) || selected.equals(new_sugg_text_url_or_year) && flag == 1) {
				newValidationSuggestion(idNewSuggestion, "0", "1");
			}
			
			if(suggestionType.equals("Rank") || suggestionType.equals("Gender")) {
			    if(createNewSuggCheck) { //if new
			    	newValidationSuggestion(idNewSuggestion, "1", "1");	
			    }
			}
			
			Notification notification = new Notification("Thank you for your suggestion.", "Our elves are hard at work on it.");
			notification.setHtmlContentAllowed(true);
			notification.setIcon(FontAwesome.THUMBS_O_UP);
			notification.setDelayMsec(1500);
			notification.show(UI.getCurrent().getPage());
			
			//update uiService now that validation_suggestions are complete
    		_MainUI.getApi().getUIService().recordVal(_MainUI.getApi().getIdProfile(), person_name, origSuggestion, suggestionType);
    		
    		//update Validation with completion time
			updateValidation();
			
			//close modal window
			sub.close();
		}
	}
	
	private void updateValidation() {
		try {
			String sql = 
					"UPDATE Validation SET date_completed = CURRENT_TIMESTAMP "
					+ "WHERE idValidation = ? ";
			
	        PreparedStatement stmt =  _MainUI.getApi().getConnStmt(sql);

	        stmt.setString(1, idValidation);
	        
        	stmt.executeUpdate();
	        
        	System.out.println("Com SUGG: profile id = " + _MainUI.getApi().getProfile().getIdProfile() + ", mode = " + suggestionMode + ", expId = " + _MainUI.getApi().getProfile().getIdExperiment());

	        stmt.getConnection().close();
	        stmt.close();
		} catch (SQLException e) {
			System.out.println("ERROR updateValidation(): " + e);
		}
	}


	private void updateSuggestionConf() {
		try {
		      Context initialContext = new InitialContext();
		      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
		      
		      if (datasource != null) {
		        Connection conn = datasource.getConnection();
		        String sql = 
		        		"UPDATE Suggestion SET confidence = ? "
		        		+ "WHERE idSuggestion = ?";
		        
		        PreparedStatement stmt = conn.prepareStatement(sql);
		        
		        
		        if (suggestionType.equals("University") || suggestionType.equals("Bachelors") || suggestionType.equals("Masters") 
		        		|| suggestionType.equals("Doctorate") || suggestionType.equals("PostDoc")) {
		        	//clean uni name
		        	String uni_name_check = newSuggestion;
		        	String[] check_split = null;
		        	if(newSuggestion.contains(" -")) {
		        		check_split = newSuggestion.split(" - ");
		        		uni_name_check = check_split[0];
		        	} else if (newSuggestion.contains(" \\(")) {
		        		check_split = newSuggestion.split(" \\(");
		        		uni_name_check = check_split[0];
		        	}

		         	//find the suggestion %LIKE% w/ highest confidence level
		        	newSuggestion = getUniSuggestion(uni_name_check);
			    }
		        
		        idNewSuggestion = _MainUI.getApi().getIdSuggestion(person_id, newSuggestion, suggestionType);
		        
		        stmt.setString(1, newMaxConf);
		        stmt.setString(2, idNewSuggestion);
		        System.out.println("newConfSuggestion(): conf = " + newMaxConf + ", idNewSuggestion = " + idNewSuggestion);
		        try {
			        stmt.executeUpdate();
		        } catch (SQLException e) {
					System.out.println("Error: newConfSelSugg() " + e.getMessage());
				}
		        stmt.close();
		        conn.close();
		      }
		    }
	        catch (Exception ex)
	        {
	        	System.out.println("Exception: " + ex);
	        }
	}


	private String getUniSuggestion(String uni_name_check) {
		String result = "";
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT idSuggestion, suggestion, MAX(confidence) as max_conf " 
	        		+ "FROM Suggestion "
	        		+ "WHERE idPerson = ? AND suggestion LIKE ?";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        stmt.setString(1, person_id);
	        stmt.setString(2, "%" + uni_name_check + "%");
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					result = rs.getString("suggestion");
				}
	        } catch (SQLException e) {
				System.out.println("error getUniSuggestion(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Exception getUniSuggestion(): " + ex);
        }
		
		return result;
	}


	public String getIdSuggestionType(String suggestionType){
		String result = "";
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT idSuggestionType FROM SuggestionType "
	        		+ "WHERE type = ?";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        stmt.setString(1, suggestionType);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					result = rs.getString("idSuggestionType");
				}
	        } catch (SQLException e) {
				System.out.println("error idSuggestionType " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Exception idSuggestionType() " + ex);
        }
		
		return result;
	}
	
	private boolean checkNewSuggestion() {
		boolean isNew = false;
		
		try {
		      Context initialContext = new InitialContext();
		      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
		      
		      if (datasource != null) {
		    	  Connection conn = datasource.getConnection();
				String sql = 
				    	"SELECT COUNT(*) as count, idSuggestion, "
						+ "(SELECT MAX(confidence+1) FROM Suggestion WHERE idPerson = ? AND "
						+ "idSuggestionType = (SELECT idSuggestionType FROM SuggestionType WHERE type = ?)) as max_conf "
						+ "FROM Suggestion "
						+ "WHERE suggestion = ? "
						+ "AND idPerson = ? "
						+ "AND idSuggestionType = (SELECT idSuggestionType FROM SuggestionType WHERE type = ?) ";
				PreparedStatement stmt = conn.prepareStatement(sql);
				stmt.setString(1, person_id);
				stmt.setString(2, suggestionType);
				stmt.setString(3, newSuggestion);
				stmt.setString(4, person_id);
				stmt.setString(5, suggestionType);
				try {
					ResultSet rs = stmt.executeQuery();
					while (rs.next()) {
						if(rs.getString("count").equals("0")) {
							isNew = true;
						} else {
							idNewSuggestion = rs.getString("idSuggestion");
						}
						newMaxConf = rs.getString("max_conf");
					}
				} catch (SQLException e) {
					System.out.println("Error: checkNewSuggestion() " + e.getMessage());
				}
		        stmt.close();
		        conn.close();
		      }
		    } catch (Exception ex) {
	        	System.out.println("Exception: " + ex);
	        }
		
		return isNew;
	}
	
	public String getEntryType() {
		String idEntryType = "4";
		
		if(suggestionMode.equals("experiment")) {
			String idExperiment = _MainUI.getApi().getProfile().getIdExperiment();
			if(idExperiment.equals("1")) {
				idEntryType = "8";
			} else if(idExperiment.equals("2")) {
				idEntryType = "9";
			} else { //3
				idEntryType = "10";
			}
		}
		
		return idEntryType;
	}
	
	private void newSuggestion() {
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
	      //System.out.println("newSuggestion() idNewSuggestion try " + suggestionType);
	     
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = "INSERT INTO Suggestion " +
	        		"(idSuggestion, idPerson, idProfile, idEntryType, idSuggestionType, suggestion, suggestion_original, comment, confidence) " + 
	        		"VALUES(NULL, ?, ?, ?, ?, ?, ?, NULL, ?)";
	        
	        PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
	        
	        String sugTypeId = getIdSuggestionType(suggestionType);
	        
	        stmt.setString(1, person_id);
	        stmt.setString(2, _MainUI.getApi().getIdProfile()); 
	        stmt.setString(3, "4"); //idEntryType, always the same from web browser
	        stmt.setString(4, sugTypeId);
	        stmt.setString(5, newSuggestion);
	        stmt.setString(6, idSuggestion); 
		    stmt.setString(7, newMaxConf); //confidence from max confidence, new_sugg_conf	
	        
	        try {
		        int affectedRows = stmt.executeUpdate();
		        
		        if (affectedRows == 0) {
		            throw new SQLException("Creating new suggestion failed, no rows affected.");
		        }
		        try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
		            if (generatedKeys.next()) {
		        		idNewSuggestion = generatedKeys.getString(1);
		        		//System.out.println("newSuggestion() idNewSuggestion = " + idNewSuggestion);
		        		_MainUI.getApi().getUIService().recordSugg(_MainUI.getApi().getIdProfile(), person_name, origSuggestion, newSuggestion, suggestionType);
		       	      
		            } else {
		                throw new SQLException("Creating failed, no ID obtained.");
		            }
		        }
	        } catch (SQLException e) {
				System.out.println("Error: newSuggestion() " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    } catch (Exception ex) {
        	System.out.println("Exception newSuggestion(): " + ex);
        }
	}
	
	private void newValidation() {
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);

	      //System.out.println("newValidation() START");
	      
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = "INSERT INTO Validation (idValidation, idSuggestion, idProfile, idExperiment, mode, "
	        		+ "interaction_count, interaction_score, interaction_count_total, interaction_score_total, visits, date, date_completed) "
	        		+ "VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, NULL);";
	        
	        PreparedStatement stmt = conn.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
	        stmt.setString(1, idSuggestion);
	        stmt.setString(2, _MainUI.getApi().getIdProfile());
	        stmt.setString(3, _MainUI.getApi().getProfile().getIdExperiment());
	        stmt.setString(4, suggestionMode);
	        stmt.setInt(5, _MainUI.getApi().getInteractionCount());
	        stmt.setInt(6, _MainUI.getApi().getInteractionScore());
	        stmt.setInt(7, _MainUI.getApi().getInteractionCountTot());
	        stmt.setInt(8, _MainUI.getApi().getInteractionScoreTot());
	        stmt.setString(9,  _MainUI.getApi().getProfile().getVisits());
	        
	        int affectedRows = stmt.executeUpdate();
	        
	        if (affectedRows == 0) {
	            throw new SQLException("Creating failed, no rows affected.");
	        }
	        try (ResultSet generatedKeys = stmt.getGeneratedKeys()) {
	            if (generatedKeys.next()) {
	        		idValidation = generatedKeys.getString(1);
	        		System.out.println("newValidation() idNewValidation = " + idValidation);
	            } else {
	                throw new SQLException("ERROR newValidation() Creating failed, no ID obtained.");
	            }
	        }
	        
	        stmt.close();
	        conn.close();
	      }
	    } catch (Exception ex) {
        	System.out.println("Exception newValidation(): " + ex);
        }
	}
	
	private void newValidationSuggestion(String suggestion_id, String isNewSug, String isChosenSug) {
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
	      
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = "INSERT INTO Validation_Suggestion " +
	        		"(idValidation, idSuggestion, new, chosen) VALUES (?, ?, ?, ?)";
	        
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        stmt.setString(1, idValidation);
	        stmt.setString(2, suggestion_id);
	        stmt.setString(3, isNewSug);
	        stmt.setString(4, isChosenSug);
	        System.out.println("newValidationSuggestion: idValidation =  " + idValidation + ", suggestion_id = " + suggestion_id);
	        try {
		        stmt.executeUpdate();
	        } catch (SQLException e) {
				System.out.println("Error ValidationSuggestion(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex) {
        	System.out.println("Exception ValidationSuggestions " + ex);
        }
	}
	
	private List<String> getSuggestions() throws SQLException {
		boolean uni_clean = false;
		if(suggestionType.equals("University") || suggestionType.equals("Bachelors") || suggestionType.equals("Masters") || suggestionType.equals("Doctorate") || suggestionType.equals("PostDoc")) {
			uni_clean = true;
		}
		
		List<String> list = new ArrayList<String>();
		suggestionsMap.clear();
		suggestionsMap_temp.clear();
		
		try {
	      Context initialContext = new InitialContext();
	      DataSource datasource = (DataSource)initialContext.lookup(DATASOURCE_CONTEXT);
	      if (datasource != null) {
	        Connection conn = datasource.getConnection();
	        String sql = 
	        		"SELECT DISTINCT * FROM Suggestion "
	        		+ "WHERE idSuggestionType = (SELECT idSuggestionType FROM SuggestionType WHERE type = ?) "
	        		+ "AND idPerson = ? AND suggestion != ? "
	        		+ "ORDER BY confidence desc, CHAR_LENGTH(suggestion) DESC LIMIT 4";
	        PreparedStatement stmt = conn.prepareStatement(sql);
	        stmt.setString(1, suggestionType);
	        stmt.setString(2, person_id);
	        stmt.setString(3, origSuggestion);
	        try {
	        	ResultSet rs = stmt.executeQuery();
				while (rs.next()) {
					if(!uni_clean) {
						list.add(rs.getString("suggestion"));	
					}
					suggestionsMap.put(rs.getString("idSuggestion"), rs.getString("suggestion"));
				}
	        } catch (SQLException e) {
				System.out.println("ERROR getSuggestions(): " + e.getMessage());
			}
	        stmt.close();
	        conn.close();
	      }
	    }
        catch (Exception ex)
        {
        	System.out.println("Exception personSelect() get suggestion " + ex);
        }
		
		//add original suggestion first, to make sure it shows up for the end user
		suggestionsMap.put(idSuggestion, origSuggestion);
				
		//Cleans list of duplicate university names
		if(uni_clean) {
			cleanUniDuplicates(list);
		} else {
			list.add(origSuggestion);
		}
		
		return list;
	}
	
	private List<String> cleanUniDuplicates(List<String> list) {
		for (Map.Entry<String, String> pair1 : suggestionsMap.entrySet()) {
	        int matches = 0;
	        String sugg = pair1.getValue().toString();
	        
	        if(!sugg.contains(" -") && !sugg.contains(" \\(")) {
	        	for (Map.Entry<String, String> pair2 : suggestionsMap.entrySet()) {
			        String[] check1 = pair2.getValue().toString().split(" - ");
			        String[] check2 = pair2.getValue().toString().split(" \\(");
			        
			        if(sugg.contains(check1[0]) || sugg.contains(check2[0])) {
			        	matches++;
			        }
		        }
		        if(matches < 2) {
		        	suggestionsMap_temp.put(pair1.getKey(), pair1.getValue());
		        }
	        } else {
	        	suggestionsMap_temp.put(pair1.getKey(), pair1.getValue());
	        }
	    }
		
		suggestionsMap = suggestionsMap_temp;
		Collections.shuffle(Arrays.asList(suggestionsMap)); //randomize order
	
		//create new list for UI
	    for (Map.Entry<String, String> entry : suggestionsMap.entrySet()) {
	    	//System.out.println("list add: " + entry.getValue().toString());
	        list.add(entry.getValue().toString());
	    }
	    return list;
	}


	private void addValidators() {
		suggestion_textbox.setRequiredError("Suggestion cannot be the same as previous entry.");
		
		//only needed for non-gender / subrank selection
	    suggestion_textbox.setValue("");
	    suggestion_textbox.removeAllValidators();
	    suggestion_textbox.setWidth("100%");
	    if(suggestionType.equals("PhotoUrl") || suggestionType.equals("Sources")) {
		    suggestion_textbox.setInputPrompt("Enter a new URL");
		    suggestion_textbox.setMaxLength(1000);
			suggestions_optiongroup.setValue(new_sugg_text_url_or_year);
		} else {
		    suggestion_textbox.setInputPrompt("Enter a new Join Year");
		    suggestion_textbox.setMaxLength(4);
		}
	}
	
	@SuppressWarnings("serial")
	private void addListeners() {
		
		subfields.addValueChangeListener(e -> selectNew());
		universities.addValueChangeListener(e -> selectNew());
		
		suggestion_textbox.addBlurListener(new BlurListener() {
			@Override
			public void blur(BlurEvent event) {
				if(suggestionType.equals("JoinYear")) {
			    	suggestion_textbox.addValidator(new StringLengthValidator("Must be valid 4 digit year.", 4, 4, false));
			    } else {
			    	suggestion_textbox.addValidator(new StringLengthValidator("Must be less than and 1000 characters.", 0, 1000, true));
			    }
			}
		});
		
		suggestion_textbox.addTextChangeListener(new TextChangeListener() {
			private static final long serialVersionUID = -1485868429452740817L;
			
			Integer flag = 0;
			
			@Override
			public void textChange(TextChangeEvent change) {
				selectNew();
				
				for (Object item : suggestions_optiongroup.getItemIds()) {
					if (item.toString().equals(change.getText()) || change.getText().equals(new_sugg_text) 
							|| change.getText().equals(new_sugg_text_url_or_year) || change.getText().equals("other")) {
						flag = 1;
					} else if (flag != 1) {
						//System.out.println("NoM: " + change.getText() + " = " + item.toString());
					}
				}
				if (flag == 1) {
					submitSuggestion_button.setEnabled(false);
					suggestion_textbox.setRequired(true);
				} else {
					suggestion_textbox.setRequired(false);
					if(!suggestions_optiongroup.isEmpty()){
						submitSuggestion_button.setEnabled(true);
					}
				}
				flag = 0;
			}
		});
	}

	private Object selectNew() {
		if(suggestionType.equals("PhotoUrl") || suggestionType.equals("Sources")) {
			suggestions_optiongroup.setValue(new_sugg_text_url_or_year);
		} else {
			suggestions_optiongroup.setValue(new_sugg_text);
		}
		
		return null;
	}
}
